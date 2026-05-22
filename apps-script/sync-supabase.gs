// ============================================================
// sync-supabase.gs — Apps Script de sincronización Drive → Supabase
// ============================================================
//
// Setup paso a paso:
//
// 1. Andá a https://script.google.com → New project.
//
// 2. Pegá este archivo entero en Code.gs (o como se llame).
//
// 3. Engranaje (Project Settings) → Script Properties → Add property
//    para cada uno de estos:
//      SUPABASE_URL       = https://fsvdcpqzchrezkxflyfi.supabase.co
//      SUPABASE_SECRET_KEY = sb_secret_xxxxxxx (la secret de Supabase)
//      CB_FOLDER_ID       = 1J7NORR3iwnjbKrlAbjB79N7h5kIGFYR3
//      FS_FOLDER_ID       = 1T-LHydjyW9Z3AW8httrslCJTgNzEcfST
//
// 4. Ejecutar manualmente la función `syncAll` una vez para autorizar
//    permisos de Drive (Apps Script pide consentimiento la primera vez).
//
// 5. Triggers (reloj en la barra lateral) → Add Trigger:
//      Function: syncAll
//      Event source: Time-driven
//      Type: Minutes timer → Every 10 minutes
//
// Logs: View → Executions, o Logger.log lo ves desde el editor.

const SB_TABLES = {
  contactos: 'contactos',
  cb: 'cuadro_basico_semanal',
  floorShare: 'floor_share',
  syncStatus: 'sync_status',
};

function syncAll() {
  const props = PropertiesService.getScriptProperties();
  const ctx = {
    sbUrl: (props.getProperty('SUPABASE_URL') || '').replace(/\/$/, ''),
    sbKey: props.getProperty('SUPABASE_SECRET_KEY'),
    cbFolderId: props.getProperty('CB_FOLDER_ID'),
    fsFolderId: props.getProperty('FS_FOLDER_ID'),
  };
  if (!ctx.sbUrl || !ctx.sbKey) {
    throw new Error('Faltan SUPABASE_URL o SUPABASE_SECRET_KEY en Script Properties');
  }
  if (!ctx.cbFolderId) throw new Error('Falta CB_FOLDER_ID en Script Properties');

  const syncStatus = loadSyncStatus(ctx);
  syncCBFolder(ctx, syncStatus);
  if (ctx.fsFolderId) syncFSFolder(ctx, syncStatus);
  Logger.log('Sync completado');
}

// Útil para reprocesar todo desde cero (vacía sync_status).
function resetSyncStatus() {
  const props = PropertiesService.getScriptProperties();
  const ctx = {
    sbUrl: (props.getProperty('SUPABASE_URL') || '').replace(/\/$/, ''),
    sbKey: props.getProperty('SUPABASE_SECRET_KEY'),
  };
  sbFetch(ctx.sbUrl + '/rest/v1/sync_status?filename=neq.__none__', ctx, { method: 'DELETE' });
  Logger.log('sync_status vaciado');
}

// ----- Drive: walk folders y dispatch ---------------------------------------

function loadSyncStatus(ctx) {
  const res = sbFetch(ctx.sbUrl + '/rest/v1/sync_status?select=*', ctx);
  const map = {};
  for (const r of res || []) map[r.filename] = r;
  return map;
}

function syncCBFolder(ctx, syncStatus) {
  const files = DriveApp.getFolderById(ctx.cbFolderId).getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    if (!/\.csv$/i.test(name)) continue;
    if (!needsSync(file, syncStatus[name])) continue;
    try {
      if (/^tienda[-_\s]?promotor[-_\s]?supervisor/i.test(name)) {
        syncContactos(file, ctx);
      } else if (/^\d+\.csv$/i.test(name)) {
        const semana = parseInt(name.replace(/\.csv$/i, ''), 10);
        syncCuadroBasico(file, semana, ctx);
      } else {
        Logger.log('Saltado (nombre no reconocido en /CB): ' + name);
      }
    } catch (err) {
      writeSyncStatus(ctx, file, 'error', 0, String(err && err.message || err));
      Logger.log('Error en ' + name + ': ' + err);
    }
  }
}

function syncFSFolder(ctx, syncStatus) {
  const files = DriveApp.getFolderById(ctx.fsFolderId).getFiles();
  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    if (!/\.csv$/i.test(name)) continue;
    if (!needsSync(file, syncStatus[name])) continue;
    // Soporta los dos formatos: "YYYY-MM_CATEGORIA.csv" (mensual) y
    // "XX-CATEGORIA.csv" / "XX_CATEGORIA.csv" (semanal).
    let periodo, semana, categoria;
    const m1 = name.match(/^(\d{4})-(\d{2})[_-](.+?)\.csv$/i);
    const m2 = name.match(/^(\d+)[_-](.+?)\.csv$/i);
    if (m1) {
      periodo = m1[1] + '-' + m1[2];
      semana = null;
      categoria = m1[3].toLowerCase().replace(/_+/g, ' ').trim();
    } else if (m2) {
      semana = parseInt(m2[1], 10);
      periodo = String(new Date().getFullYear()) + '-W' + String(semana).padStart(2, '0');
      categoria = m2[2].toLowerCase().replace(/_+/g, ' ').trim();
    } else {
      Logger.log('Saltado (nombre no reconocido en /floor-share): ' + name);
      continue;
    }
    try {
      syncFloorShare(file, periodo, semana, categoria, ctx);
    } catch (err) {
      writeSyncStatus(ctx, file, 'error', 0, String(err && err.message || err));
      Logger.log('Error en ' + name + ': ' + err);
    }
  }
}

function needsSync(file, status) {
  if (!status) return true;
  const lastModified = file.getLastUpdated();
  const lastSynced = new Date(status.drive_modified);
  return lastModified > lastSynced;
}

// ----- Parsers especializados por tipo de archivo ---------------------------

function syncContactos(file, ctx) {
  const rows = parseFile(file);
  const out = [];
  for (const r of rows) {
    // Prioridad 1: columna combinada "NN - NOMBRE" (formato común).
    const combined = pick(r, [
      'nombre de la tienda', 'tienda hmpdv',
      'tienda nro nombre', 'tienda numero y nombre',
    ]);
    let numero = '';
    let nombre = '';
    if (combined) {
      const m = combined.match(/^(\d+)\s*[-–]\s*(.+)$/) || combined.match(/^(\d+)\s+(.+)$/);
      if (m) {
        numero = m[1];
        nombre = m[2].trim();
      } else {
        nombre = combined;
      }
    }
    // Fallback: columnas separadas.
    if (!numero) {
      numero = pick(r, [
        'n tienda', 'numero tienda', 'nro tienda',
        'id tienda', 'numero', 'nro', 'n',
        'codigo tienda', 'cod tienda', 'codigo', 'cod',
        'store', 'store id',
      ]) || pickFuzzy(r, [/(n°|nº|n |nro|num|numero|cod|codigo|id)/]);
    }
    if (!nombre) {
      nombre = pick(r, [
        'nombre pdv', 'nombre tienda', 'nombre de tienda',
        'tienda', 'sucursal', 'punto de venta', 'pdv', 'nombre',
      ]);
    }
    if (!numero || !nombre) continue;
    out.push({
      numero_tienda: numero,
      nombre_tienda: nombre,
      cadena: pick(r, ['cadena', 'cliente/cadena', 'cliente']) || '',
      promotor: pick(r, ['promotor']) || '',
      supervisor: pick(r, ['supervisor']) || '',
      email_promotor:
        pick(r, ['email promotor', 'email_promotor', 'email', 'mail', 'correo',
                 'correo electronico', 'e mail', 'e mail promotor',
                 'mail promotor', 'correo promotor']) ||
        pickFuzzy(r, [/email|mail|correo/]) || '',
    });
  }
  const deduped = dedupByKey(out, function (r) { return r.numero_tienda + '|' + r.nombre_tienda; });
  upsertBatch(ctx, SB_TABLES.contactos, deduped);
  writeSyncStatus(ctx, file, 'ok', deduped.length, null);
  Logger.log('contactos: ' + deduped.length + ' filas (dedup ' + (out.length - deduped.length) + ')');
}

function syncCuadroBasico(file, semana, ctx) {
  const rows = parseFile(file);
  const out = [];
  for (const r of rows) {
    const tienda = pick(r, ['tienda hmpdv', 'tienda']);
    const sku = pick(r, ['sku mabe', 'sku']);
    if (!tienda || !sku) continue;
    const tu = tienda.toUpperCase();
    if (tu === 'TOTAL' || tu.indexOf('TOTAL ') === 0 || tu === 'SUBTOTAL') continue;
    if (sku.toUpperCase() === 'TOTAL') continue;

    const targetCB = parseInt(pick(r, ['targetcb', 'target cb']), 10) || 0;
    let realCB = parseInt(pick(r, ['realcb', 'real cb']), 10) || 0;
    const targetInf = parseInt(pick(r, ['targetinf', 'target inf']), 10) || 0;
    let realInf = parseInt(pick(r, ['realinf', 'real inf']), 10) || 0;
    if (targetCB === 0 && targetInf === 0) continue;
    if (realCB > targetCB) realCB = targetCB;
    if (realInf > targetInf) realInf = targetInf;
    const tipoSku = (targetCB - targetInf) === 0 ? 'Infaltable' : 'Estratégico';
    out.push({
      semana: semana,
      tienda: tienda,
      sku: sku,
      cliente: pick(r, ['cliente/cadena', 'cliente cadena', 'cliente']) || '',
      division: pick(r, ['division']) || '',
      target_cb: targetCB,
      real_cb: realCB,
      target_inf: targetInf,
      real_inf: realInf,
      tipo_sku: tipoSku,
    });
  }
  const deduped = dedupByKey(out, function (r) { return r.semana + '|' + r.tienda + '|' + r.sku; });
  upsertBatch(ctx, SB_TABLES.cb, deduped);
  writeSyncStatus(ctx, file, 'ok', deduped.length, null);
  Logger.log('CB semana ' + semana + ': ' + deduped.length + ' filas (dedup ' + (out.length - deduped.length) + ')');
}

// Floor Share: estructura "wide".
// - Fila 0: nombres de marca en columnas pares (después de la col de Tienda).
// - Fila 1: pares de headers ("Participación Anaquel" + "%Part") por marca.
// - Fila 2+: cada fila es una tienda (en la col "Tienda") con pares
//   (unidades, %) por marca.
// El formato semanal tiene "Formato" en col 0 y "Tienda" en col 1.
function syncFloorShare(file, periodo, semana, categoria, ctx) {
  const grid = parseFileRaw(file);
  if (grid.length < 3) {
    writeSyncStatus(ctx, file, 'ok', 0, 'archivo vacío');
    return;
  }
  const headerBrands = grid[0].map(function (c) { return (c || '').toString().trim(); });
  const headerCols = grid[1].map(function (c) { return (c || '').toString().trim().toLowerCase(); });

  // Detectar dónde está la columna de Tienda; los datos arrancan en la siguiente.
  let storeCol = -1;
  for (let i = 0; i < headerCols.length; i++) {
    if (/^(tienda|pdv|punto de venta)$/.test(headerCols[i])) {
      storeCol = i;
      break;
    }
  }
  if (storeCol < 0) storeCol = 0;
  const dataStartCol = storeCol + 1;

  const brandPairs = [];
  for (let col = dataStartCol; col < headerBrands.length; col += 2) {
    const brand = (headerBrands[col] || headerBrands[col + 1] || '').trim();
    if (!brand || /^total$/i.test(brand)) continue;
    brandPairs.push({ brand: brand, unitsCol: col, pctCol: col + 1 });
  }

  const out = [];
  for (let i = 2; i < grid.length; i++) {
    const row = grid[i];
    if (!row || row.length <= storeCol) continue;
    const storeCell = (row[storeCol] || '').toString();
    const store = splitStoreCell(storeCell);
    if (!store || !store.name) continue;
    if (/^total\b/i.test(store.name)) continue;

    for (let p = 0; p < brandPairs.length; p++) {
      const pair = brandPairs[p];
      const units = parseLocaleNumber(row[pair.unitsCol]) || 0;
      const pct = parseLocaleNumber(row[pair.pctCol]);
      if (units <= 0) continue;
      out.push({
        periodo: periodo,
        semana: semana,
        categoria: categoria,
        numero_tienda: store.number,
        nombre_tienda: store.name,
        marca: pair.brand,
        unidades: Math.round(units),
        pct_raw: pct,
      });
    }
  }
  const deduped = dedupByKey(out, function (r) {
    return r.periodo + '|' + r.categoria + '|' + r.numero_tienda + '|' + r.nombre_tienda + '|' + r.marca;
  });
  upsertBatch(ctx, SB_TABLES.floorShare, deduped);
  writeSyncStatus(ctx, file, 'ok', deduped.length, null);
  Logger.log('floor_share ' + periodo + ' ' + categoria + ': ' + deduped.length + ' filas (dedup ' + (out.length - deduped.length) + ')');
}

// Quita filas con la misma clave; deja la última ocurrencia.
function dedupByKey(rows, keyFn) {
  const seen = {};
  for (let i = 0; i < rows.length; i++) seen[keyFn(rows[i])] = rows[i];
  const out = [];
  for (const k in seen) out.push(seen[k]);
  return out;
}

// ----- CSV parsing ----------------------------------------------------------

function readText(file) {
  const blob = file.getBlob();
  let text = blob.getDataAsString('UTF-8');
  if (text.indexOf('�') >= 0) {
    text = blob.getDataAsString('Windows-1252');
  }
  return text.replace(/^﻿/, '').replace(/\r\n/g, '\n').trim();
}

function detectDelimiter(text) {
  const firstLine = text.split('\n')[0] || '';
  if (firstLine.indexOf(';') >= 0) return ';';
  if (firstLine.indexOf('\t') >= 0) return '\t';
  return ',';
}

// Devuelve grid bruto [filas][columnas].
function parseFileRaw(file) {
  const text = readText(file);
  return Utilities.parseCsv(text, detectDelimiter(text));
}

// Devuelve array de objects con headers normalizados.
function parseFile(file) {
  const grid = parseFileRaw(file);
  if (!grid || grid.length === 0) return [];
  const headers = grid[0].map(normalizeHeader);
  const out = [];
  for (let i = 1; i < grid.length; i++) {
    const row = grid[i];
    if (!row) continue;
    let empty = true;
    for (let j = 0; j < row.length; j++) if (row[j]) { empty = false; break; }
    if (empty) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = (row[j] || '').toString().trim();
    }
    out.push(obj);
  }
  return out;
}

function normalizeHeader(h) {
  return (h || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s_\-]+/g, ' ')
    .trim();
}

function pick(row, names) {
  for (let i = 0; i < names.length; i++) {
    const k = normalizeHeader(names[i]);
    if (row[k] != null && row[k] !== '') return row[k];
  }
  return '';
}

// Fallback: busca cualquier columna cuyo header normalizado matchee
// alguna de las regex pasadas. Útil cuando hay muchas variantes del nombre.
function pickFuzzy(row, regexes) {
  for (const k in row) {
    for (let i = 0; i < regexes.length; i++) {
      if (regexes[i].test(k)) {
        const v = row[k];
        if (v != null && v !== '') return v;
      }
    }
  }
  return '';
}

function parseLocaleNumber(s) {
  if (s == null) return null;
  const str = String(s).trim();
  if (!str) return null;
  let cleaned = str.replace(/\s/g, '').replace(/%/g, '');
  if (cleaned.indexOf('.') >= 0 && cleaned.indexOf(',') >= 0) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.indexOf(',') >= 0) {
    cleaned = cleaned.replace(',', '.');
  }
  const n = Number(cleaned);
  return isFinite(n) ? n : null;
}

function splitStoreCell(cell) {
  const trimmed = (cell || '').trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (upper === 'TOTAL' || upper.indexOf('TOTAL ') === 0 || upper === 'SUBTOTAL') return null;
  const m = trimmed.match(/^(\d+)\s*[-–]\s*(.+)$/);
  if (m) return { number: String(parseInt(m[1], 10)), name: m[2].trim() };
  const m2 = trimmed.match(/^(\d+)\s+(.+)$/);
  if (m2) return { number: String(parseInt(m2[1], 10)), name: m2[2].trim() };
  return { number: '', name: trimmed };
}

// ----- Supabase fetch wrappers ----------------------------------------------

function sbFetch(url, ctx, options) {
  options = options || {};
  const opts = {
    method: options.method || 'GET',
    contentType: 'application/json',
    headers: {
      apikey: ctx.sbKey,
      Authorization: 'Bearer ' + ctx.sbKey,
    },
    muteHttpExceptions: true,
  };
  if (options.headers) {
    for (const k in options.headers) opts.headers[k] = options.headers[k];
  }
  if (options.body) opts.payload = options.body;
  const res = UrlFetchApp.fetch(url, opts);
  const code = res.getResponseCode();
  if (code >= 400) {
    throw new Error('Supabase ' + opts.method + ' ' + url + ' -> ' + code + ': ' + res.getContentText());
  }
  const text = res.getContentText();
  return text ? JSON.parse(text) : null;
}

function upsertBatch(ctx, table, rows) {
  if (!rows.length) return;
  const url = ctx.sbUrl + '/rest/v1/' + table;
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    sbFetch(url, ctx, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(chunk),
    });
  }
}

function writeSyncStatus(ctx, file, status, rowsProcessed, errorMsg) {
  const url = ctx.sbUrl + '/rest/v1/sync_status';
  sbFetch(url, ctx, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify([{
      filename: file.getName(),
      drive_id: file.getId(),
      drive_modified: file.getLastUpdated().toISOString(),
      synced_at: new Date().toISOString(),
      rows_processed: rowsProcessed,
      status: status,
      error_msg: errorMsg,
    }]),
  });
}
