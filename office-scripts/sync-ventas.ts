/**
 * sync-ventas.ts — Office Script para Excel Online
 *
 * Corre dentro del workbook "FC + BO 2026 - Hanna.xlsx" y empuja la data
 * al dashboard Vercel. Reemplaza al flow de Power Automate porque éste
 * tiene un cap duro de 5000 filas en el connector de Excel; los Office
 * Scripts corren dentro de Excel y leen las 35K+ filas sin restricción.
 *
 * Flujo:
 *   1. Refrescar todas las data connections del workbook (Power Query
 *      etc) — equivalente al botón "Refresh All" del tab Data.
 *   2. GET /api/cb-pairs → lista de "CLIENTE|SKU" del Cuadro Básico.
 *   3. Leer tabla FC del workbook, mapear columnas a schema, filtrar por
 *      los pares del CB.
 *   4. Idem tabla BO.
 *   5. POST /api/ventas con {fc: [...], bo: [...]}.
 *
 * Cómo instalarlo:
 *   1. Abrir el Excel en Excel Online (en navegador, no en escritorio).
 *   2. Cinta superior → Automate → New Script.
 *   3. Pegar TODO este archivo en el editor (sobrescribir el `function main`
 *      placeholder).
 *   4. Editar las constantes de CONFIG abajo (URL y secret).
 *   5. Verificar los nombres de tabla y columnas en COLUMN_MAPPING — tienen
 *      que matchear los headers exactos del Excel de Hanna.
 *   6. Save → nombrar "Sync Dashboard Ventas".
 *   7. Para correrlo: cinta Automate → click en el script → Run.
 *      O agregar un botón en la hoja: Insert → Shape → click derecho →
 *      Assign Script → "Sync Dashboard Ventas".
 *
 * Sin licencia Premium. Sin App Registration. Sin IT.
 */

// =========================================================================
// CONFIG — editar antes del primer uso
// =========================================================================

const CONFIG = {
  // URL base del dashboard. Sin slash final.
  apiBase: "https://cuadros-basicos.vercel.app",
  // El mismo REFRESH_SECRET1 que está en Vercel env vars (el que ya usa
  // Power Automate hoy). Pedírselo al dev.
  secret: "PEGAR_REFRESH_SECRET1_ACA",

  // Nombre interno de la tabla FC en el workbook (Excel: solapa FC →
  // Table Design → Table Name). Si no fue renombrada, suele ser "Table1".
  tableNameFC: "FC",
  tableNameBO: "BO",
};

// Mapeo de campos del schema → headers de columna en el Excel. La primera
// alternativa que matchee (case-insensitive, trim) se usa. Si los headers
// del Excel cambian, agregar variantes acá.
const COLUMN_MAPPING = {
  fc: {
    documentoVentas: ["No. de Orden ID", "Documento Venta", "No de Orden ID"],
    cliente: ["Cliente", "Cliente Descripción", "Cliente Descripcion"],
    sku: ["Material ID", "Material", "SKU"],
    unidades: ["VolumenVentas", "Volumen Ventas", "CANTIDAD PEDIDO FC", "Cantidad"],
    fecha: ["EjercicioPeriodo", "Ejercicio Periodo", "Ejercicio Período", "EjercicioPeríodo", "Fecha de Creación de Factura", "Fecha Creación Doc. Venta", "Fecha"],
    vendedor: ["Ejecutivo de Venta", "Ejecutivo Venta Descripción", "Vendedor"],
  },
  bo: {
    documentoVentas: ["Documento Venta", "No. de Orden ID"],
    cliente: ["Cliente Descripción", "Cliente Descripcion", "Cliente"],
    sku: ["Material", "Material ID", "SKU"],
    unidades: ["Cantidad Pendiente", "CantidadPendiente", "Cantidad"],
    fecha: ["Fecha Creación Cabecera", "Fecha Creación", "Fecha"],
    vendedor: [
      "Cliente Venta Ejecutivo Venta Descripción",
      "Ejecutivo Venta Descripción",
      "Ejecutivo de Venta",
      "Vendedor",
    ],
  },
};

// =========================================================================
// Tipos
// =========================================================================

type PayloadRow = {
  documentoVentas: string | number;
  cliente: string;
  sku: string;
  unidades: number;
  fecha: string | number;
  vendedor: string;
};

type Mapping = Record<string, string[]>;

// =========================================================================
// Helpers
// =========================================================================

function normalizeCliente(s: string): string {
  return String(s ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

// Convierte fechas de Excel a un formato que el server reconozca:
//   * YYYYMMDD (8 dígitos, ej. 20260427) → passthrough (server lo parsea).
//   * YYYYNNN (7 dígitos, ej. 2026004) → "YYYY-MM-01". Es el campo
//     EjercicioPeriodo que usa SAP (Año + Período fiscal/contable).
//   * Excel serial (0-100K, ej. 46121) → YYYY-MM-DD vía new Date().
//   * String → passthrough.
function normalizeRawFecha(raw: unknown): string | number {
  if (typeof raw === "number") {
    if (raw >= 10000000 && raw < 99999999 && Number.isInteger(raw)) return raw;
    if (raw >= 1000000 && raw < 10000000 && Number.isInteger(raw)) {
      const year = Math.floor(raw / 1000);
      const month = raw % 1000;
      if (year >= 2000 && year < 2100 && month >= 1 && month <= 12) {
        return `${year}-${String(month).padStart(2, "0")}-01`;
      }
    }
    if (raw > 0 && raw < 100000) {
      const utcMs = (raw - 25569) * 86400 * 1000;
      const d = new Date(utcMs);
      if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return raw;
  }
  return String(raw ?? "");
}

function buildIndex(headers: string[], mapping: Mapping): Record<string, number> {
  const lc = headers.map((h) => String(h ?? "").trim().toLowerCase());
  const idx: Record<string, number> = {};
  for (const key of Object.keys(mapping)) {
    const candidates = mapping[key];
    let found = -1;
    for (const c of candidates) {
      const i = lc.indexOf(c.trim().toLowerCase());
      if (i >= 0) { found = i; break; }
    }
    if (found < 0) {
      throw new Error(
        `No encontré la columna "${key}". Headers del Excel: [${headers.join(", ")}]. ` +
        `Candidatos buscados: [${candidates.join(", ")}]. ` +
        `Editar COLUMN_MAPPING en el script.`,
      );
    }
    idx[key] = found;
  }
  return idx;
}

function readTable(
  workbook: ExcelScript.Workbook,
  tableName: string,
  mapping: Mapping,
  cbPairs: Set<string>,
): PayloadRow[] {
  const table = workbook.getTable(tableName);
  if (!table) {
    throw new Error(`No existe la tabla "${tableName}" en el workbook.`);
  }
  const headers = table.getHeaderRowRange().getValues()[0].map((v) => String(v ?? ""));
  const idx = buildIndex(headers, mapping);

  // Leemos en chunks de 5K filas porque getValues() de una tabla entera
  // (35K filas × 20 cols) supera el límite de payload del runtime de
  // Office Scripts (~5MB). El total de chunks se loguea para que Hanna
  // vea progreso.
  const dataBody = table.getRangeBetweenHeaderAndTotal();
  const rowCount = dataBody.getRowCount();
  const colCount = dataBody.getColumnCount();
  const startRow = dataBody.getRowIndex();
  const startCol = dataBody.getColumnIndex();
  const sheet = dataBody.getWorksheet();

  const CHUNK = 5000;
  const out: PayloadRow[] = [];
  for (let r = 0; r < rowCount; r += CHUNK) {
    const thisChunk = Math.min(CHUNK, rowCount - r);
    const chunkRange = sheet.getRangeByIndexes(startRow + r, startCol, thisChunk, colCount);
    const values = chunkRange.getValues();
    console.log(`  ${tableName}: chunk ${r + 1}-${r + thisChunk} de ${rowCount} filas leído`);
    for (const row of values) {
      const cliente = String(row[idx["cliente"]] ?? "");
      const sku = String(row[idx["sku"]] ?? "");
      if (!cliente || !sku) continue;
      const key = `${normalizeCliente(cliente)}|${sku}`;
      if (!cbPairs.has(key)) continue;
      out.push({
        documentoVentas: row[idx["documentoVentas"]] as string | number,
        cliente,
        sku,
        unidades: Number(row[idx["unidades"]] ?? 0),
        fecha: normalizeRawFecha(row[idx["fecha"]]),
        vendedor: String(row[idx["vendedor"]] ?? ""),
      });
    }
  }
  return out;
}

// =========================================================================
// Main
// =========================================================================

async function main(workbook: ExcelScript.Workbook) {
  console.log("Sync Dashboard Ventas — arrancando");

  // 1) Refrescar Power Query y todas las data connections del workbook.
  //    Equivalente a clickear "Refresh All" en el tab Data. Sin esto las
  //    tablas FC y BO siguen mostrando la data vieja del último guardado.
  console.log("Refrescando data connections del workbook…");
  workbook.refreshAllDataConnections();
  console.log("Refresh OK.");

  // 2) Bajar los pares del CB del servidor.
  console.log("Pidiendo lista CB al servidor…");
  const cbRes = await fetch(`${CONFIG.apiBase}/api/cb-pairs?secret=${encodeURIComponent(CONFIG.secret)}`);
  if (!cbRes.ok) {
    throw new Error(`GET /api/cb-pairs falló: ${cbRes.status} ${await cbRes.text()}`);
  }
  const cbBody = (await cbRes.json()) as { pairs: string[]; count: number };
  const cbSet = new Set(cbBody.pairs);
  console.log(`CB pairs recibidos: ${cbSet.size}`);

  // 3) Leer y filtrar FC.
  console.log(`Leyendo tabla "${CONFIG.tableNameFC}"…`);
  const fc = readTable(workbook, CONFIG.tableNameFC, COLUMN_MAPPING.fc, cbSet);
  console.log(`FC filtradas: ${fc.length}`);

  // 4) Leer y filtrar BO.
  console.log(`Leyendo tabla "${CONFIG.tableNameBO}"…`);
  const bo = readTable(workbook, CONFIG.tableNameBO, COLUMN_MAPPING.bo, cbSet);
  console.log(`BO filtradas: ${bo.length}`);

  if (fc.length === 0 && bo.length === 0) {
    throw new Error("Después del filtro CB no quedó ninguna fila. Revisar nombres de cliente/SKU.");
  }

  // 5) POST al dashboard.
  const payload = {
    generatedAt: new Date().toISOString(),
    fc,
    bo,
  };
  const bodyStr = JSON.stringify(payload);
  console.log(`POSTeando ${(bodyStr.length / 1024).toFixed(0)} KB al dashboard…`);

  const postRes = await fetch(`${CONFIG.apiBase}/api/ventas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-refresh-secret": CONFIG.secret,
    },
    body: bodyStr,
  });
  const postBody = await postRes.text();
  if (!postRes.ok) {
    throw new Error(`POST /api/ventas falló: ${postRes.status}\n${postBody}`);
  }
  console.log(`Sync OK:\n${postBody}`);
}
