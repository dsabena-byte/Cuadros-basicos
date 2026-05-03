// ============= MAPEO TIENDAS =============
const TIENDAS_RAW = `1|Casa Del Audio Canning|La Casa Del Audio|Fernandez Matias|Raimundo
1|Genesio Hogar Córdoba. Av. Velez Sarfield|Genesio Hogar|Cavalie Gaston|Mauricio
1|Petenatti Hogar RioCuarto|Petenatti Hogar|Amaya Heliana|Mauricio
12|On City Quilmes|On City|Perez Martina|Raimundo
124|Frávega Once Ciudad (Casa Central)|Frávega Sa|Rozhenal Axel|Raimundo
137|Casa Del Audio Almagro|La Casa Del Audio|Rozhenal Axel|Raimundo
140|Casa Del Audio Laferrere|La Casa Del Audio|Rodriguez Diana|Raimundo
150|Rodó 1 Boedo 1050|Rodo Hogar|Rozhenal Axel|Raimundo
164|Cetrogar Santa Fé|Cetrogar Sa|Gayford Emiliano|Mauricio
166|Cetrogar Paraná Calle Pellegrini|Cetrogar Sa|Damonte Alba|Mauricio
17|On City Calle Rioja|On City|Scoppa Victor|Mauricio
171|Cetrogar Salta Calle Alberdi|Cetrogar Sa|Andrada Gimena|Mauricio
172|Cetrogar Salta Calle Belgrano|Cetrogar Sa|Andrada Gimena|Mauricio
26|Cetrogar Jujuy|Cetrogar Sa|Andrada Gimena|Mauricio
27|Cetrogar San Pedro|Cetrogar Sa|Andrada Gimena|Mauricio
5|Cetrogar Portal Salta|Cetrogar Sa|Andrada Gimena|Mauricio
173|Frávega Córdoba Av. General Paz|Frávega Sa|Cavalie Gaston|Mauricio
174|Frávega Córdoba 9 De Julio|Frávega Sa|Cavalie Gaston|Mauricio
195|On City Córdoba 9 De Julio|On City|Cavalie Gaston|Mauricio
196|On City Córdoba Colón Y Sagrada Familia|On City|Pagano Antonella|Mauricio
197|On City Córdoba Rivera Indarte|On City|Cavalie Gaston|Mauricio
2|Casa del Audio Pilar|La Casa Del Audio|Vallejo Margarita|Raimundo
2|Genesio Hogar Juan B. Justo|Genesio Hogar|Pagano Antonella|Mauricio
2|Nexon San Martín|Nexon|Gayford Emiliano|Mauricio
2|Novogar Zona Sur 1|Novogar|Scoppa Victor|Mauricio
205|Saturno Colón II|Saturno Hogar Sa|Pagano Antonella|Mauricio
206|Saturno Colón I|Saturno Hogar Sa|Pagano Antonella|Mauricio
207|Saturno Hogar Sa|Saturno Hogar Sa|Cavalie Gaston|Mauricio
21|Cetrogar Las Heras|Cetrogar Sa|Añazco Joel|Mauricio
210|Saturno Recta Martinolli|Saturno Hogar Sa|Cavalie Gaston|Mauricio
216|CastilloJujuy|Castillo|Andrada Gimena|Mauricio
218|Castillo Tucumán. Calle 25 De Mayo|Castillo|Soria Carolina|Mauricio
237|On City Tucumán Peatonal Muñecas|On City|Soria Carolina|Mauricio
238|On City Tucumán Calle Mitre|On City|Soria Carolina|Mauricio
24|Cetrogar General Guemes|Cetrogar Sa|Andrada Gimena|Mauricio
246|Oscar Barbieri Calle 25 De Mayo|Barbieri Oscar Sa|Soria Carolina|Mauricio
265|Bringeri San Nicolás De Los Arroyos|Bringeri|Devito Lujan|Raimundo
27|Naldo La Plata|Naldo Lombardi|Perez Martina|Raimundo
28|Cetrogar Mar Del Plata|Cetrogar Sa|Rodriguez Daniela|Raimundo
3|La Casa del Audio Caballito|La Casa Del Audio|Rozhenal Axel|Raimundo
3|Novogar San Justo|Novogar|Rodriguez Diana|Raimundo
313|Authogar Peralta Ramos|Autohogar|Rodriguez Daniela|Raimundo
316|Authogar Luro|Autohogar|Rodriguez Daniela|Raimundo
318|Authogar Calle Estrada|Autohogar|Rodriguez Daniela|Raimundo
319|Authogar Calle Alberti|Autohogar|Rodriguez Daniela|Raimundo
325|FAVA MAR DEL PLATA AV. LURO|Fava Hnos Sa|Rodriguez Daniela|Raimundo
352|Frávega Martínez|Frávega Sa|Paez Esteban|Raimundo
362|Frávega Dot Saavedra|Frávega Sa|Paez Esteban|Raimundo
371|Frávega Alto Avellaneda|Frávega Sa|Fernandez Matias|Raimundo
376|Frávega Paraná|Frávega Sa|Damonte Alba|Mauricio
376|Jumbo Martinez Unicenter Shopping|Jumbo|Paez Esteban|Raimundo
38|Casa Del Audio Lomas De Zamora|La Casa Del Audio|Fernandez Matias|Raimundo
381|On City San Isidro|On City|Vallejo Margarita|Raimundo
383|Frávega Río Cuarto|Frávega Sa|Amaya Heliana|Mauricio
383|On City Unicenter Martínez|On City|Paez Esteban|Raimundo
388|Rodó Belgrano|Rodo Hogar|Paez Esteban|Raimundo
389|Rodó Unicenter Martínez|Rodo Hogar|Paez Esteban|Raimundo
390|Rodó Champagnat Pilar|Rodo Hogar|Vallejo Margarita|Raimundo
391|Rodó Palermo|Rodo Hogar|Paez Esteban|Raimundo
4|Coppel Quilmes Factory|Coppel Ma|Bost Sebastian|Raimundo
4|Naldo San Nicolas de los Arroyos|Naldo Lombardi|Devito Lujan|Raimundo
417|On City Mendoza Calle San Martín 1335|On City|Añazco Joel|Mauricio
418|On City Mendoza Calle San Martín 1549|On City|Añazco Joel|Mauricio
422|On City Guaymallén|On City|Añazco Joel|Mauricio
425|On City Godoy Cruz|On City|Añazco Joel|Mauricio
466|Casa Del Audio Merlo|La Casa Del Audio|Rodriguez Diana|Raimundo
467|Casa Del Audio Moreno Ii|La Casa Del Audio|Rodriguez Diana|Raimundo
469|Casa Del Audio Moreno Iii|La Casa Del Audio|Rodriguez Diana|Raimundo
471|Casa Del Audio Flores|La Casa Del Audio|Rozhenal Axel|Raimundo
473|On City Plaza Oeste|On City|Rodriguez Diana|Raimundo
477|On City Caballito|On City|Rozhenal Axel|Raimundo
50|Casa Del Audio San Justo I|La Casa Del Audio|Rodriguez Diana|Raimundo
51|Casa Del Audio Quilmes|La Casa Del Audio|Bost Sebastian|Raimundo
52|Casa Del Audio Berazategui|La Casa Del Audio|Bost Sebastian|Raimundo
53|Casa del Audio San Francisco Solano|La Casa Del Audio|Bost Sebastian|Raimundo
543|Frávega Rosario Calle Rioja|Frávega Sa|Scoppa Victor|Mauricio
557|On City Rosario San Martín|On City|Scoppa Victor|Mauricio
558|On City Alto Rosario Shopping|On City|Scoppa Victor|Mauricio
560|Novogar Baigorria|Novogar|Scoppa Victor|Mauricio
562|On City Rosario Portal|On City|Scoppa Victor|Mauricio
563|On City Rosario Alberdi|On City|Scoppa Victor|Mauricio
569|On City Sta. Fé Suc.5|On City|Gayford Emiliano|Mauricio
570|On City Sta Fe. Calle San Martín|On City|Gayford Emiliano|Mauricio
572|On City Villa G. Galvez|On City|Scoppa Victor|Mauricio
574|Novogar Rosario Calle Córdoba|Novogar|Scoppa Victor|Mauricio
578|Novogar Rosario Zona Sur 2|Novogar|Scoppa Victor|Mauricio
612|Rodó 2 Boedo 1069|Rodo Hogar|Rozhenal Axel|Raimundo
63|Radio Sapienza Lomas De Zamora|Radio Sapienza Sa|Fernandez Matias|Raimundo
64|Radio Sapienza Monte Grande|Radio Sapienza Sa|Fernandez Matias|Raimundo
641|Casa Del Audio Ituzaingo|La Casa Del Audio|Rodriguez Diana|Raimundo
642|La Casa Del Audio|La Casa Del Audio|Rodriguez Diana|Raimundo
65|Radio Sapienza San José. Temperley|Radio Sapienza Sa|Bost Sebastian|Raimundo
695|Casa Del Audio Parque Avellaneda Mataderos|La Casa Del Audio|Rozhenal Axel|Raimundo
699|Casa Del Audio Monte Grande|La Casa Del Audio|Fernandez Matias|Raimundo
700|Casa Del Audio San Fernando|La Casa Del Audio|Vallejo Margarita|Raimundo
715|Castillo Concepción|Castillo|Soria Carolina|Mauricio
74|Alayian La Plata Calle 12|Alayian Hnos Cia Sacifia|Perez Martina|Raimundo
76|Aloise Los Hornos|Aloise Y Cia Sa|Perez Martina|Raimundo
760|Oscar Barbieri Monteros|Barbieri Oscar Sa|Soria Carolina|Mauricio
762|Oscar Barbieri Concepción|Barbieri Oscar Sa|Soria Carolina|Mauricio
765|Castillo Monteros|Castillo|Soria Carolina|Mauricio
769|Cetrogar Carlos Paz|Cetrogar Sa|Pagano Antonella|Mauricio
771|Castillo Av. San Martín|Castillo|Andrada Gimena|Mauricio
777|Cetrogar Portal Shopping Rosario|Cetrogar Sa|Scoppa Victor|Mauricio
780|Coppel Flores|Coppel Ma|Rozhenal Axel|Raimundo
782|On City Rosario Peatonal Córdoba|On City|Scoppa Victor|Mauricio
789|On City Alta Córdoba|On City|Pagano Antonella|Mauricio
80|On City Merlo|On City|Rodriguez Diana|Raimundo
8010|Coppel La Plata|Coppel Ma|Perez Martina|Raimundo
8015|Coppel Quilmes|Coppel Ma|Bost Sebastian|Raimundo
8017|Coppel General Pacheco|Coppel Ma|Vallejo Margarita|Raimundo
81|Aloise La Plata Calle 12 Y 57|Aloise Y Cia Sa|Perez Martina|Raimundo
8101|Coppel Escobar|Coppel Ma|Vallejo Margarita|Raimundo
816|On City Sta Fe. Calle Blas Parera|On City|Gayford Emiliano|Mauricio
819|On City Aristóbulo|On City|Gayford Emiliano|Mauricio
820|On City Santo Tomé|On City|Gayford Emiliano|Mauricio
822|On City Paraná Calle Pellegrini|On City|Damonte Alba|Mauricio
823|On City Paraná Calle San Martín|On City|Damonte Alba|Mauricio
853|On City Salta|On City|Andrada Gimena|Mauricio
867|On City Río Cuarto|On City|Amaya Heliana|Mauricio`;

const KPI_COLORS = { cb: '#1e40af', inf: '#8b5cf6', est: '#ec4899' };

const norm = s => (s || '').toString().trim().toUpperCase()
  .replace(/[ÁÀÄÂ]/g,'A').replace(/[ÉÈËÊ]/g,'E').replace(/[ÍÌÏÎ]/g,'I')
  .replace(/[ÓÒÖÔ]/g,'O').replace(/[ÚÙÜÛ]/g,'U').replace(/Ñ/g,'N')
  .replace(/[^\w ]/g,'').replace(/\s+/g, ' ');

const tiendaKey = (numero, nombre) => numero + '|' + norm(nombre);

const tiendaKeyFromHMPDV = (tienda) => {
  if (!tienda) return '';
  const m = tienda.toString().trim().match(/^(\d+)\s*[-–]\s*(.+)$/);
  if (!m) return norm(tienda);
  return m[1] + '|' + norm(m[2]);
};

const tiendasMap = {};
TIENDAS_RAW.split('\n').forEach(line => {
  const parts = line.split('|');
  if (parts.length < 5) return;
  const num = parts[0], nombre = parts[1], cadena = parts[2], promotor = parts[3], supervisor = parts[4];
  if (!num || !nombre) return;
  tiendasMap[tiendaKey(num, nombre)] = {
    promotor: (promotor || '').trim(),
    supervisor: (supervisor || '').trim(),
    cadena: (cadena || '').trim(),
  };
});

function semanaToMes(semana) {
  const s = parseInt(semana);
  if (isNaN(s)) return '?';
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const idx = Math.min(11, Math.floor((s - 1) / 4.33));
  return meses[idx];
}

const pctClass = p => {
  if (p === null || p === undefined || isNaN(p)) return 'pct-gray';
  if (p >= 100) return 'pct-green';
  if (p >= 60) return 'pct-amber';
  return 'pct-red';
};
const fmtPct = p => (p === null || p === undefined || isNaN(p)) ? '—' : Math.round(p) + '%';
const escapeHtml = s => (s || '').toString().replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ============= ESTADO =============
let allData = [];
let semanasCargadas = new Set();
let chartInstances = [];
let sortKey = 'pctCB', sortDir = 'asc';

// ============= PARSEO CSV =============
function parseCSVText(text, semana) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const firstLine = text.split('\n')[0];
  const delim = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';
  const parsed = Papa.parse(text, {
    header: true, delimiter: delim, skipEmptyLines: 'greedy',
    transformHeader: h => h.trim()
  });
  const mes = semanaToMes(semana);
  const rows = [];
  parsed.data.forEach(r => {
    const get = function() {
      for (let i = 0; i < arguments.length; i++) {
        const n = arguments[i];
        const k = Object.keys(r).find(k => k && k.trim().toLowerCase() === n.toLowerCase());
        if (k) return r[k];
      }
      return '';
    };
    const tienda = get('TIENDA HMPDV', 'TIENDA');
    const sku = get('SKU MABE', 'SKU');
    if (!tienda || !sku) return;
    const tiendaUpper = tienda.toString().trim().toUpperCase();
    if (tiendaUpper === 'TOTAL' || tiendaUpper.startsWith('TOTAL ') || tiendaUpper === 'SUBTOTAL') return;
    const targetCB = parseInt(get('targetCB')) || 0;
    let realCB = parseInt(get('realCB')) || 0;
    const targetInf = parseInt(get('targetInf')) || 0;
    let realInf = parseInt(get('realInf')) || 0;
    if (targetCB === 0 && targetInf === 0) return;
    realCB = Math.min(realCB, targetCB);
    realInf = Math.min(realInf, targetInf);
    const tipoSKU = (targetCB - targetInf) === 0 ? 'Infaltable' : 'Estratégico';
    const key = tiendaKeyFromHMPDV(tienda);
    const info = tiendasMap[key] || {};
    rows.push({
      semana: parseInt(semana), mes, sku, tienda,
      cliente: get('CLIENTE/CADENA', 'CLIENTE'),
      division: get('DIVISION'),
      targetCB, realCB, targetInf, realInf, tipoSKU,
      promotor: info.promotor || 'Sin asignar',
      supervisor: info.supervisor || 'Sin asignar',
    });
  });
  return rows;
}

// ============= FILTROS =============
function getFilters() {
  return {
    mes: document.getElementById('fMes').value,
    semana: document.getElementById('fSemana').value,
    division: document.getElementById('fDivision').value,
    supervisor: document.getElementById('fSupervisor').value,
    promotor: document.getElementById('fPromotor').value,
    cliente: document.getElementById('fCliente').value,
    tienda: document.getElementById('fTienda').value,
  };
}

function applyFilters(data) {
  const f = getFilters();
  return data.filter(r => {
    if (f.mes && r.mes !== f.mes) return false;
    if (f.semana && String(r.semana) !== f.semana) return false;
    if (f.division && r.division !== f.division) return false;
    if (f.supervisor && r.supervisor !== f.supervisor) return false;
    if (f.promotor && r.promotor !== f.promotor) return false;
    if (f.cliente && r.cliente !== f.cliente) return false;
    if (f.tienda && r.tienda !== f.tienda) return false;
    return true;
  });
}

function fillSelect(id, items, current, formatter) {
  const sel = document.getElementById(id);
  const v = current && items.map(String).includes(String(current)) ? current : '';
  let html = '<option value="">Todos</option>';
  items.forEach(i => {
    const sel2 = String(i) === String(v) ? 'selected' : '';
    const label = formatter ? formatter(i) : escapeHtml(i);
    html += '<option value="' + escapeHtml(i) + '" ' + sel2 + '>' + label + '</option>';
  });
  sel.innerHTML = html;
}

function populateFilters() {
  const f = getFilters();
  const mesesOrden = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const meses = [...new Set(allData.map(r => r.mes))].sort((a,b) => mesesOrden.indexOf(a) - mesesOrden.indexOf(b));
  fillSelect('fMes', meses, f.mes);

  let dataS = f.mes ? allData.filter(r => r.mes === f.mes) : allData;
  const semanas = [...new Set(dataS.map(r => r.semana))].sort((a,b) => a - b);
  fillSelect('fSemana', semanas, f.semana, s => 'Semana ' + s);

  let dataD = dataS;
  if (f.semana) dataD = dataD.filter(r => String(r.semana) === f.semana);
  const divisiones = [...new Set(dataD.map(r => r.division).filter(Boolean))].sort();
  fillSelect('fDivision', divisiones, f.division);

  let dataSup = dataD;
  if (f.division) dataSup = dataSup.filter(r => r.division === f.division);
  const sups = [...new Set(dataSup.map(r => r.supervisor))].sort();
  fillSelect('fSupervisor', sups, f.supervisor);

  let dataP = dataSup;
  if (f.supervisor) dataP = dataP.filter(r => r.supervisor === f.supervisor);
  const proms = [...new Set(dataP.map(r => r.promotor))].sort();
  fillSelect('fPromotor', proms, f.promotor);

  let dataC = dataP;
  if (f.promotor) dataC = dataC.filter(r => r.promotor === f.promotor);
  const cls = [...new Set(dataC.map(r => r.cliente))].sort();
  fillSelect('fCliente', cls, f.cliente);

  let dataT = dataC;
  if (f.cliente) dataT = dataT.filter(r => r.cliente === f.cliente);
  const tdas = [...new Set(dataT.map(r => r.tienda))].sort();
  fillSelect('fTienda', tdas, f.tienda);
}

// ============= CÁLCULOS =============
function calcKPIs(data) {
  let tCB=0, rCB=0, tInf=0, rInf=0;
  data.forEach(r => { tCB += r.targetCB; rCB += r.realCB; tInf += r.targetInf; rInf += r.realInf; });
  const tEst = tCB - tInf, rEst = rCB - rInf;
  return {
    pctCB: tCB > 0 ? (rCB / tCB) * 100 : null,
    pctInf: tInf > 0 ? (rInf / tInf) * 100 : null,
    pctEst: tEst > 0 ? (rEst / tEst) * 100 : null,
    targetCB: tCB, realCB: rCB, targetInf: tInf, realInf: rInf, targetEst: tEst, realEst: rEst,
    tiendas: new Set(data.map(r => r.tienda)).size,
    skus: new Set(data.map(r => r.sku)).size,
    semanas: new Set(data.map(r => r.semana)).size,
  };
}

function rankBy(data, key) {
  const groups = {};
  data.forEach(r => {
    const k = r[key] || 'Sin asignar';
    if (!groups[k]) groups[k] = { key: k, tCB:0, rCB:0, tInf:0, rInf:0, tiendas: new Set() };
    groups[k].tCB += r.targetCB; groups[k].rCB += r.realCB;
    groups[k].tInf += r.targetInf; groups[k].rInf += r.realInf;
    groups[k].tiendas.add(r.tienda);
  });
  return Object.values(groups).map(g => {
    const tEst = g.tCB - g.tInf, rEst = g.rCB - g.rInf;
    return {
      key: g.key,
      pctCB: g.tCB > 0 ? (g.rCB / g.tCB) * 100 : 0,
      pctInf: g.tInf > 0 ? (g.rInf / g.tInf) * 100 : 0,
      pctEst: tEst > 0 ? (rEst / tEst) * 100 : 0,
      targetCB: g.tCB, realCB: g.rCB, targetInf: g.tInf, realInf: g.rInf,
      targetEst: tEst, realEst: rEst, tiendas: g.tiendas.size,
    };
  });
}

function evolucionPorSemana(data) {
  const groups = {};
  data.forEach(r => {
    const s = r.semana;
    if (!groups[s]) groups[s] = { semana: s, tCB:0, rCB:0, tInf:0, rInf:0 };
    groups[s].tCB += r.targetCB; groups[s].rCB += r.realCB;
    groups[s].tInf += r.targetInf; groups[s].rInf += r.realInf;
  });
  return Object.values(groups).sort((a,b) => a.semana - b.semana).map(g => {
    const tEst = g.tCB - g.tInf, rEst = g.rCB - g.rInf;
    return {
      semana: g.semana,
      pctCB: g.tCB > 0 ? (g.rCB/g.tCB)*100 : 0,
      pctInf: g.tInf > 0 ? (g.rInf/g.tInf)*100 : 0,
      pctEst: tEst > 0 ? (rEst/tEst)*100 : 0,
    };
  });
}

// ============= RENDER =============
function destroyCharts() { chartInstances.forEach(c => c.destroy()); chartInstances = []; }

function updateBadges() {
  const badges = document.getElementById('semanasBadges');
  if (!badges) return;
  const semanas = [...semanasCargadas].sort((a,b) => a-b);
  if (semanas.length === 0) {
    badges.innerHTML = '';
    return;
  }
  badges.innerHTML = '<span style="font-size:11px;color:#64748b;margin-right:6px;">Cargadas:</span>' +
    semanas.map(s => '<span class="badge">Sem ' + s + '</span>').join('');
  const info = document.getElementById('dataInfo');
  if (info) info.textContent = allData.length.toLocaleString() + ' filas · ' + semanas.length + ' semana(s)';
}

function render() {
  destroyCharts();
  const content = document.getElementById('content');
  if (allData.length === 0) {
    content.innerHTML = '<div class="empty card">📁 Sumá uno o más CSVs para empezar</div>';
    return;
  }
  const data = applyFilters(allData);
  const k = calcKPIs(data);
  const f = getFilters();
  if (data.length === 0) {
    content.innerHTML = '<div class="empty card">🔍 Sin datos para los filtros seleccionados</div>';
    return;
  }
  const showRankPromotor = !f.promotor;
  const showRankCliente = !f.cliente;
  const showEvolucion = k.semanas > 1;

  let html = '<div class="kpis">' +
    '<div class="kpi cb"><div class="label">% Cuadro Básico</div><div class="value">' + fmtPct(k.pctCB) + '</div><div class="sub-val">' + k.realCB + ' / ' + k.targetCB + '</div></div>' +
    '<div class="kpi inf"><div class="label">% Infaltables</div><div class="value">' + fmtPct(k.pctInf) + '</div><div class="sub-val">' + k.realInf + ' / ' + k.targetInf + '</div></div>' +
    '<div class="kpi est"><div class="label">% Estratégico</div><div class="value">' + fmtPct(k.pctEst) + '</div><div class="sub-val">' + k.realEst + ' / ' + k.targetEst + '</div></div>' +
    '<div class="kpi green"><div class="label">Tiendas</div><div class="value">' + k.tiendas + '</div></div>' +
    '<div class="kpi amber"><div class="label">SKUs</div><div class="value">' + k.skus + '</div></div>' +
    '<div class="kpi gray"><div class="label">Semanas</div><div class="value">' + k.semanas + '</div></div>' +
    '<div class="kpi gray"><div class="label">Total Target CB</div><div class="value">' + k.targetCB + '</div></div>' +
    '</div>';

  if (showEvolucion) {
    html += '<div class="chart-box"><h3>📈 Evolución semanal</h3><div class="chart-wrap"><canvas id="chEvol"></canvas></div></div>';
  }
  html += '<div class="chart-box"><h3>📊 Cumplimiento por Categoría</h3><div class="chart-wrap"><canvas id="chCategoria"></canvas></div></div>';

  html += '<div class="charts">';
  if (showRankPromotor) html += '<div class="chart-box"><h3>🏆 Cumplimiento por Promotor</h3><div class="chart-wrap tall"><canvas id="chPromotor"></canvas></div></div>';
  if (showRankCliente) html += '<div class="chart-box"><h3>🏪 Cumplimiento por Cliente/Cadena</h3><div class="chart-wrap tall"><canvas id="chCliente"></canvas></div></div>';
  if (!showRankPromotor && !showRankCliente) html += '<div class="chart-box" style="grid-column: 1 / -1;"><h3>🏬 Cumplimiento por Tienda</h3><div class="chart-wrap tall"><canvas id="chTiendas"></canvas></div></div>';
  html += '</div>';

  html += '<div class="card"><h3 style="font-size:14px; margin-bottom:10px;">📋 Detalle por Tienda</h3><div class="table-wrap"><table id="tablaDet"><thead><tr>' +
    '<th data-sort="tienda">Tienda</th><th data-sort="promotor">Promotor</th><th data-sort="cliente">Cliente</th>' +
    '<th data-sort="targetCB">Tgt CB</th><th data-sort="realCB">Real CB</th>' +
    '<th data-sort="pctCB">% CB</th><th data-sort="pctInf">% Inf</th><th data-sort="pctEst">% Est</th>' +
    '</tr></thead><tbody id="tBody"></tbody></table></div></div>';

  if (f.tienda || f.cliente) {
    html += '<div class="card"><h3 style="font-size:14px; margin-bottom:10px;">🔍 Detalle de SKUs — ' + escapeHtml(f.tienda || f.cliente) + '</h3><div id="skuDetalle"></div></div>';
  }
  content.innerHTML = html;

  if (showEvolucion) renderEvolucion(data);
  renderCategoria(data);
  if (showRankPromotor) renderRanking(data, 'promotor', 'chPromotor');
  if (showRankCliente) renderRanking(data, 'cliente', 'chCliente');
  if (!showRankPromotor && !showRankCliente) renderRankTiendas(data);
  renderTabla(data);
  if (f.tienda || f.cliente) renderSkuDetalle(data);
  attachSortHandlers();
}

function valueLabelsPlugin(orientation) {
  return {
    id: 'valueLabels_' + orientation,
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;
      ctx.save();
      ctx.font = 'bold 10px -apple-system, sans-serif';
      ctx.fillStyle = '#0f172a';
      chart.data.datasets.forEach((dataset, i) => {
        const meta = chart.getDatasetMeta(i);
        meta.data.forEach((bar, idx) => {
          const value = dataset.data[idx];
          if (value === null || value === undefined) return;
          const txt = Math.round(value) + '%';
          if (orientation === 'vertical') {
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(txt, bar.x, bar.y - 4);
          } else {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(txt, bar.x + 4, bar.y);
          }
        });
      });
      ctx.restore();
    }
  };
}

function renderEvolucion(data) {
  const evol = evolucionPorSemana(data);
  const ctx = document.getElementById('chEvol');
  if (!ctx) return;
  chartInstances.push(new Chart(ctx, {
    type: 'line',
    data: {
      labels: evol.map(e => 'Sem ' + e.semana),
      datasets: [
        { label: '% CB', data: evol.map(e => e.pctCB.toFixed(1)), borderColor: KPI_COLORS.cb, backgroundColor: KPI_COLORS.cb + '20', tension: 0.3, borderWidth: 2 },
        { label: '% Infaltables', data: evol.map(e => e.pctInf.toFixed(1)), borderColor: KPI_COLORS.inf, backgroundColor: KPI_COLORS.inf + '20', tension: 0.3, borderWidth: 2 },
        { label: '% Estratégico', data: evol.map(e => e.pctEst.toFixed(1)), borderColor: KPI_COLORS.est, backgroundColor: KPI_COLORS.est + '20', tension: 0.3, borderWidth: 2 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } },
      plugins: { legend: { position: 'bottom' } }
    }
  }));
}

function renderCategoria(data) {
  const ranking = rankBy(data, 'division').sort((a,b) => b.targetCB - a.targetCB);
  const ctx = document.getElementById('chCategoria');
  if (!ctx) return;
  chartInstances.push(new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ranking.map(r => r.key),
      datasets: [
        { label: '% CB', data: ranking.map(r => r.pctCB.toFixed(1)), backgroundColor: KPI_COLORS.cb },
        { label: '% Infaltables', data: ranking.map(r => r.pctInf.toFixed(1)), backgroundColor: KPI_COLORS.inf },
        { label: '% Estratégico', data: ranking.map(r => r.pctEst.toFixed(1)), backgroundColor: KPI_COLORS.est },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      layout: { padding: { top: 20 } },
      scales: { y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } },
      plugins: { legend: { position: 'bottom' } }
    },
    plugins: [valueLabelsPlugin('vertical')]
  }));
}

function renderRanking(data, key, canvasId) {
  const ranking = rankBy(data, key).sort((a,b) => b.pctCB - a.pctCB);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  chartInstances.push(new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ranking.map(r => r.key),
      datasets: [
        { label: '% CB', data: ranking.map(r => r.pctCB.toFixed(1)), backgroundColor: KPI_COLORS.cb },
        { label: '% Infaltables', data: ranking.map(r => r.pctInf.toFixed(1)), backgroundColor: KPI_COLORS.inf },
        { label: '% Estratégico', data: ranking.map(r => r.pctEst.toFixed(1)), backgroundColor: KPI_COLORS.est },
      ]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      layout: { padding: { right: 35 } },
      scales: { x: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } },
      plugins: { legend: { position: 'bottom' } }
    },
    plugins: [valueLabelsPlugin('horizontal')]
  }));
}

function renderRankTiendas(data) {
  const tiendas = rankBy(data, 'tienda').sort((a,b) => b.pctCB - a.pctCB);
  const ctx = document.getElementById('chTiendas');
  if (!ctx) return;
  chartInstances.push(new Chart(ctx, {
    type: 'bar',
    data: {
      labels: tiendas.map(t => t.key.length > 40 ? t.key.substring(0, 40) + '…' : t.key),
      datasets: [
        { label: '% CB', data: tiendas.map(t => t.pctCB.toFixed(1)), backgroundColor: KPI_COLORS.cb },
        { label: '% Infaltables', data: tiendas.map(t => t.pctInf.toFixed(1)), backgroundColor: KPI_COLORS.inf },
        { label: '% Estratégico', data: tiendas.map(t => t.pctEst.toFixed(1)), backgroundColor: KPI_COLORS.est },
      ]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      layout: { padding: { right: 35 } },
      scales: { x: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } } },
      plugins: { legend: { position: 'bottom' } }
    },
    plugins: [valueLabelsPlugin('horizontal')]
  }));
}

function renderTabla(data) {
  const porTienda = rankBy(data, 'tienda');
  porTienda.forEach(r => {
    const sample = data.find(d => d.tienda === r.key);
    r.promotor = sample ? sample.promotor : '';
    r.cliente = sample ? sample.cliente : '';
    r.tienda = r.key;
  });
  porTienda.sort((a, b) => {
    const va = a[sortKey], vb = b[sortKey];
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === 'asc' ? (va || 0) - (vb || 0) : (vb || 0) - (va || 0);
  });
  const tbody = document.getElementById('tBody');
  if (!tbody) return;
  tbody.innerHTML = porTienda.map(r =>
    '<tr>' +
    '<td>' + escapeHtml(r.tienda) + '</td>' +
    '<td>' + escapeHtml(r.promotor || '—') + '</td>' +
    '<td>' + escapeHtml(r.cliente || '—') + '</td>' +
    '<td>' + r.targetCB + '</td><td>' + r.realCB + '</td>' +
    '<td><span class="pct ' + pctClass(r.pctCB) + '">' + fmtPct(r.pctCB) + '</span></td>' +
    '<td><span class="pct ' + pctClass(r.pctInf) + '">' + fmtPct(r.pctInf) + '</span></td>' +
    '<td><span class="pct ' + pctClass(r.pctEst) + '">' + fmtPct(r.pctEst) + '</span></td>' +
    '</tr>'
  ).join('');
}

function renderSkuDetalle(data) {
  const cont = document.getElementById('skuDetalle');
  if (!cont) return;
  const f = getFilters();
  const tiendasUnicas = new Set(data.map(r => r.tienda)).size;
  const esCliente = !f.tienda && f.cliente;
  const skuMap = {};
  data.forEach(r => {
    const k = r.sku + '|' + r.tipoSKU;
    if (!skuMap[k]) {
      skuMap[k] = { sku: r.sku, tipo: r.tipoSKU, division: r.division,
        tCB:0, rCB:0, tInf:0, rInf:0, tiendasCount: new Set(), tiendasCumplen: new Set() };
    }
    skuMap[k].tCB += r.targetCB; skuMap[k].rCB += r.realCB;
    skuMap[k].tInf += r.targetInf; skuMap[k].rInf += r.realInf;
    skuMap[k].tiendasCount.add(r.tienda);
    let tgt, rl;
    if (r.tipoSKU === 'Infaltable') { tgt = r.targetInf; rl = r.realInf; }
    else { tgt = r.targetCB - r.targetInf; rl = r.realCB - r.realInf; }
    if (tgt > 0 && rl >= tgt) skuMap[k].tiendasCumplen.add(r.tienda);
  });
  const skus = Object.values(skuMap).map(s => {
    let target, real;
    if (s.tipo === 'Infaltable') { target = s.tInf; real = s.rInf; }
    else { target = s.tCB - s.tInf; real = s.rCB - s.rInf; }
    const pct = target > 0 ? Math.min(100, (real / target) * 100) : 0;
    const cumple = real >= target && target > 0;
    return { sku: s.sku, tipo: s.tipo, division: s.division, target, real, pct, cumple,
      nTiendas: s.tiendasCount.size, nTiendasCumplen: s.tiendasCumplen.size };
  }).filter(s => s.target > 0);

  const infaltables = skus.filter(s => s.tipo === 'Infaltable').sort((a,b) => a.cumple - b.cumple || b.nTiendas - a.nTiendas || a.sku.localeCompare(b.sku));
  const estrategicos = skus.filter(s => s.tipo === 'Estratégico').sort((a,b) => a.cumple - b.cumple || b.nTiendas - a.nTiendas || a.sku.localeCompare(b.sku));
  const cumplenInf = infaltables.filter(s => s.cumple).length;
  const cumplenEst = estrategicos.filter(s => s.cumple).length;

  const renderList = (lista) => {
    if (lista.length === 0) return '<div style="color:#94a3b8; font-size:12px; padding:10px;">No hay SKUs de este tipo en esta selección.</div>';
    return lista.map(s =>
      '<div class="sku-item ' + (s.cumple ? 'ok' : 'fail') + '">' +
      '<div class="sku-status">' + (s.cumple ? '✅' : '❌') + '</div>' +
      '<div class="sku-info"><div class="sku-name">' + escapeHtml(s.sku) + '</div>' +
      '<div class="sku-meta">' + escapeHtml(s.division || '') + (esCliente ? ' · ' + s.nTiendasCumplen + '/' + s.nTiendas + ' tiendas cumplen' : '') + '</div></div>' +
      '<div class="sku-pct"><span class="pct ' + pctClass(s.pct) + '">' + fmtPct(s.pct) + '</span>' +
      '<div class="sku-vals">' + s.real + ' / ' + s.target + '</div></div></div>'
    ).join('');
  };

  const subtitulo = esCliente
    ? '<div style="font-size:12px; color:#64748b; margin-bottom:10px;">📍 Vista agregada de ' + tiendasUnicas + ' tienda' + (tiendasUnicas !== 1 ? 's' : '') + ' de ' + escapeHtml(f.cliente) + '</div>'
    : '';

  cont.innerHTML = subtitulo + '<div class="sku-grid">' +
    '<div class="sku-col inf"><h4>📌 Infaltables <span class="badge-count">' + cumplenInf + ' / ' + infaltables.length + '</span></h4><div class="sku-list">' + renderList(infaltables) + '</div></div>' +
    '<div class="sku-col est"><h4>🎯 Estratégicos <span class="badge-count">' + cumplenEst + ' / ' + estrategicos.length + '</span></h4><div class="sku-list">' + renderList(estrategicos) + '</div></div>' +
    '</div>';
}

function attachSortHandlers() {
  document.querySelectorAll('#tablaDet th').forEach(th => {
    th.addEventListener('click', () => {
      const k = th.dataset.sort;
      if (sortKey === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      else { sortKey = k; sortDir = 'desc'; }
      renderTabla(applyFilters(allData));
    });
  });
}

// ============= INIT CB (listeners + render inicial) =============
function initCBControls() {
const btnExportEl = document.getElementById('btnExport');
if (btnExportEl) {
  btnExportEl.addEventListener('click', () => {
    if (allData.length === 0) {
      alert('No hay datos cargados.');
      return;
    }
    let html = document.documentElement.outerHTML;
    html = html.replace(/<body([^>]*)>/, '<body$1 data-viewer="1">');
    html = html.replace(/<div id="content">[\s\S]*?<\/div>(?=\s*<scr)/, '<div id="content"></div>');
    const dataJSON = JSON.stringify(allData);
    const semanasJSON = JSON.stringify([...semanasCargadas]);
    const fsJSON = JSON.stringify(window.__PRELOADED_FLOORSHARE__ || null);
    const closeTag = '</' + 'script>';
    const dataScript = '<script>window.__PRELOADED_DATA__=' + dataJSON + ';window.__PRELOADED_SEMANAS__=' + semanasJSON + ';window.__PRELOADED_FLOORSHARE__=' + fsJSON + ';' + closeTag;
    html = html.replace('<head>', '<head>\n' + dataScript);
    const now = new Date();
    const ts = now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0');
    const semanasStr = [...semanasCargadas].sort((a,b)=>a-b).join('-');
    const filename = 'dashboard-CB-sem' + semanasStr + '-' + ts + '.html';
    // Agregar BOM UTF-8 al inicio del archivo para que cualquier navegador
    // lo detecte correctamente como UTF-8 (especialmente en celulares)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + '<!DOCTYPE html>\n' + html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// ============= UPLOAD =============
const fileInputEl = document.getElementById('fileInput');
if (fileInputEl) {
  fileInputEl.addEventListener('change', async (e) => {
    const files = [...e.target.files];
    for (const file of files) {
      const match = file.name.match(/(\d+)/);
      const semana = match ? parseInt(match[1]) : null;
      if (!semana) {
        alert('No detecté número de semana en: ' + file.name);
        continue;
      }
      const buffer = await file.arrayBuffer();
      let text;
      try {
        text = new TextDecoder('windows-1252').decode(buffer);
        if (text.includes('Ã©') || text.includes('Ã³')) {
          text = new TextDecoder('UTF-8').decode(buffer);
        }
      } catch (err) {
        text = new TextDecoder('UTF-8').decode(buffer);
      }
      const rows = parseCSVText(text, semana);
      if (rows.length === 0) {
        alert('No se pudieron leer datos de: ' + file.name);
        continue;
      }
      allData = allData.filter(r => r.semana !== semana);
      allData.push(...rows);
      semanasCargadas.add(semana);
    }
    e.target.value = '';
    updateBadges();
    populateFilters();
    render();
  });
}

// ============= FILTROS =============
['fMes','fSemana','fDivision','fSupervisor','fPromotor','fCliente','fTienda'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', () => { populateFilters(); render(); });
});

const btnResetEl = document.getElementById('btnReset');
if (btnResetEl) {
  btnResetEl.addEventListener('click', () => {
    ['fMes','fSemana','fDivision','fSupervisor','fPromotor','fCliente','fTienda'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    populateFilters();
    render();
  });
}

if (allData.length > 0) {
  updateBadges();
  populateFilters();
}
render();
}

// ============= FLOOR SHARE =============
const FS_DREAN = 'Drean';
const FS_DREAN_COLOR = '#e63946';
const FS_COMPETIDORES = ['Whirlpool', 'Gafa', 'Electrolux', 'Philco'];
const FS_MES_NOMBRES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
// Objetivos por categoría (Floor Share Drean %). Keys = `r.category` normalizado.
const FS_TARGETS = { lavado: 32, refrigeracion: 25, coccion: 23 };
function fsTargetFor(cat) {
  if (!cat) return null;
  const key = String(cat).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(FS_TARGETS, key) ? FS_TARGETS[key] : null;
}

let fsData = [];
let fsCharts = [];
let fsSortKey = 'fsDrean', fsSortDir = 'desc';

function fsMonthLabel(code) {
  if (!code) return '';
  const m = code.match(/^(\d{4})-(\d{2})$/);
  if (!m) return code;
  const idx = parseInt(m[2], 10) - 1;
  return (FS_MES_NOMBRES[idx] || m[2]) + ' ' + m[1];
}

function fsTitleCase(s) {
  if (!s) return '';
  return s.toString().replace(/\b\p{L}/gu, c => c.toUpperCase());
}

function fsDestroyCharts() {
  fsCharts.forEach(c => { try { c.destroy(); } catch (e) {} });
  fsCharts = [];
}

function fsGetFilters() {
  return {
    mes: document.getElementById('fsMes')?.value || '',
    cliente: document.getElementById('fsCliente')?.value || '',
    categoria: document.getElementById('fsCategoria')?.value || '',
    tienda: document.getElementById('fsTienda')?.value || '',
    supervisor: document.getElementById('fsSupervisor')?.value || '',
    promotor: document.getElementById('fsPromotor')?.value || '',
  };
}

function fsApplyFilters(data, opts) {
  const f = fsGetFilters();
  const skip = opts || {};
  return data.filter(r => {
    if (!skip.mes && f.mes && r.month !== f.mes) return false;
    if (!skip.cliente && f.cliente && r.cliente !== f.cliente) return false;
    if (!skip.categoria && f.categoria && r.category !== f.categoria) return false;
    if (!skip.tienda && f.tienda && r.storeName !== f.tienda) return false;
    if (!skip.supervisor && f.supervisor && r.supervisor !== f.supervisor) return false;
    if (!skip.promotor && f.promotor && r.promotor !== f.promotor) return false;
    return true;
  });
}

function fsFillSelect(id, items, current, formatter) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const v = current && items.map(String).includes(String(current)) ? current : '';
  let html = '<option value="">' + (sel.options[0]?.text || 'Todos') + '</option>';
  items.forEach(i => {
    const sel2 = String(i) === String(v) ? 'selected' : '';
    const label = formatter ? formatter(i) : escapeHtml(i);
    html += '<option value="' + escapeHtml(i) + '" ' + sel2 + '>' + label + '</option>';
  });
  sel.innerHTML = html;
}

function fsPopulateFilters() {
  const f = fsGetFilters();

  // Cascade in visual order: Mes → Categoría → Supervisor → Promotor → Cliente → Tienda
  const meses = [...new Set(fsData.map(r => r.month))].sort();
  fsFillSelect('fsMes', meses, f.mes, fsMonthLabel);

  let pool = fsData;
  if (f.mes) pool = pool.filter(r => r.month === f.mes);

  const cats = [...new Set(pool.map(r => r.category))].sort();
  fsFillSelect('fsCategoria', cats, f.categoria, fsTitleCase);

  let poolCat = pool;
  if (f.categoria) poolCat = poolCat.filter(r => r.category === f.categoria);

  const sups = [...new Set(poolCat.map(r => r.supervisor))].sort();
  fsFillSelect('fsSupervisor', sups, f.supervisor);

  let poolSup = poolCat;
  if (f.supervisor) poolSup = poolSup.filter(r => r.supervisor === f.supervisor);

  const proms = [...new Set(poolSup.map(r => r.promotor))].sort();
  fsFillSelect('fsPromotor', proms, f.promotor);

  let poolProm = poolSup;
  if (f.promotor) poolProm = poolProm.filter(r => r.promotor === f.promotor);

  const clientes = [...new Set(poolProm.map(r => r.cliente))].sort();
  fsFillSelect('fsCliente', clientes, f.cliente);

  let poolCli = poolProm;
  if (f.cliente) poolCli = poolCli.filter(r => r.cliente === f.cliente);

  const tiendas = [...new Set(poolCli.map(r => r.storeName))].sort();
  fsFillSelect('fsTienda', tiendas, f.tienda);
}

function fsSumUnitsByBrand(rows) {
  const map = {};
  let total = 0;
  let totalFromColumn = 0;
  rows.forEach(r => {
    const isTotal = r.brand && r.brand.toLowerCase() === 'total';
    if (isTotal) {
      totalFromColumn += r.units || 0;
    } else {
      map[r.brand] = (map[r.brand] || 0) + (r.units || 0);
      total += r.units || 0;
    }
  });
  return { byBrand: map, totalUnits: totalFromColumn || total };
}

function fsBrandShare(rows, brand) {
  const { byBrand, totalUnits } = fsSumUnitsByBrand(rows);
  if (!totalUnits) return null;
  const u = byBrand[brand] || 0;
  return (u / totalUnits) * 100;
}

function fmtPctFs(p) {
  if (p === null || p === undefined || isNaN(p)) return '—';
  return (Math.round(p * 10) / 10).toFixed(1) + '%';
}

function fsRender() {
  fsDestroyCharts();
  const cont = document.getElementById('fsContent');
  if (!cont) return;

  const fsLoaded = window.__PRELOADED_FLOORSHARE__;
  if (!fsLoaded || !Array.isArray(fsData) || fsData.length === 0) {
    cont.innerHTML = '<div class="empty card">📁 No hay datos de floor share aún. Subí archivos a la subcarpeta <code>floor-share/</code> de Drive con el formato <code>YYYY-MM_categoria.csv</code>.</div>';
    return;
  }

  const f = fsGetFilters();
  const data = fsApplyFilters(fsData);
  if (data.length === 0) {
    cont.innerHTML = '<div class="empty card">🔍 Sin datos para los filtros seleccionados</div>';
    return;
  }

  const drean = fsBrandShare(data, FS_DREAN);
  const { totalUnits, byBrand } = fsSumUnitsByBrand(data);
  const dreanUnits = byBrand[FS_DREAN] || 0;
  const uniqueStores = new Set(data.map(r => (r.storeNumber || '') + '|' + (r.storeName || ''))).size;
  const scopeLabel = f.categoria ? fsTitleCase(f.categoria) : 'todas las categorías';

  let html = '';

  // Headline (con objetivo + desvío si hay categoría seleccionada)
  const headlineTarget = fsTargetFor(f.categoria);
  let headlineTargetHtml = '';
  if (headlineTarget !== null && drean !== null) {
    const delta = drean - headlineTarget;
    const deltaCls = delta >= 0 ? 'fs-delta-pos' : 'fs-delta-neg';
    const deltaTxt = (delta >= 0 ? '+' : '') + (Math.round(delta * 10) / 10).toFixed(1) + ' pp';
    headlineTargetHtml = '<div class="fs-headline-target">' +
      '<span class="fs-target-label">Objetivo</span>' +
      '<span class="fs-target-val">' + headlineTarget + '%</span>' +
      '<span class="fs-target-label">Desvío</span>' +
      '<span class="fs-delta-pill ' + deltaCls + '">' + deltaTxt + '</span>' +
      '</div>';
  }
  html += '<div class="fs-headline">' +
    '<div class="fs-headline-label">Floor Share Drean — ' + escapeHtml(scopeLabel) + '</div>' +
    '<div class="fs-headline-value">' + fmtPctFs(drean) + '</div>' +
    '<div class="fs-headline-sub">' + uniqueStores.toLocaleString('es-AR') + ' tiendas · ' + Math.round(dreanUnits).toLocaleString('es-AR') + ' unidades exhibidas / ' + Math.round(totalUnits).toLocaleString('es-AR') + ' total piso</div>' +
    headlineTargetHtml +
    '</div>';

  // Breakdown por categoría — solo si categoria = Todas
  if (!f.categoria) {
    const byCat = {};
    data.forEach(r => {
      const k = r.category;
      if (!byCat[k]) byCat[k] = [];
      byCat[k].push(r);
    });
    const cats = Object.keys(byCat).sort();
    if (cats.length > 1) {
      html += '<div class="fs-breakdown">';
      cats.forEach(cat => {
        const share = fsBrandShare(byCat[cat], FS_DREAN);
        const sums = fsSumUnitsByBrand(byCat[cat]);
        const target = fsTargetFor(cat);
        let targetHtml = '';
        if (target !== null && share !== null) {
          const delta = share - target;
          const deltaCls = delta >= 0 ? 'fs-delta-pos' : 'fs-delta-neg';
          const deltaTxt = (delta >= 0 ? '+' : '') + (Math.round(delta * 10) / 10).toFixed(1) + ' pp';
          targetHtml = '<div class="fs-mini-target">' +
            '<span class="fs-target-val">Obj ' + target + '%</span>' +
            '<span class="fs-delta-pill ' + deltaCls + '">' + deltaTxt + '</span>' +
            '</div>';
        }
        html += '<div class="fs-mini-card">' +
          '<div class="fs-mini-label">' + escapeHtml(fsTitleCase(cat)) + '</div>' +
          '<div class="fs-mini-value">' + fmtPctFs(share) + '</div>' +
          '<div class="fs-mini-sub">' + Math.round(sums.byBrand[FS_DREAN] || 0).toLocaleString('es-AR') + ' / ' + Math.round(sums.totalUnits).toLocaleString('es-AR') + '</div>' +
          targetHtml +
          '</div>';
      });
      html += '</div>';
    }
  }

  // Charts grid
  html += '<div class="fs-charts">';
  html += '<div class="chart-box"><h3>📊 Ranking de marcas</h3><div class="chart-wrap tall"><canvas id="fsChRanking"></canvas></div></div>';

  // Evolución mensual
  const dataNoMes = fsApplyFilters(fsData, { mes: true });
  const monthsInScope = [...new Set(dataNoMes.map(r => r.month))].sort();
  if (monthsInScope.length > 1) {
    html += '<div class="chart-box"><h3>📈 Evolución mensual — Drean vs Top marcas</h3><div class="chart-wrap"><canvas id="fsChEvol"></canvas></div></div>';
  }
  html += '</div>';

  // Floor Share por cliente + tabla performance equipo (lado a lado)
  const clientesEntries = fsBuildClienteShares(data);
  const promotorTable = fsBuildPromotorTable();
  const hasClientes = clientesEntries.length > 0;
  const hasPromotor = promotorTable && promotorTable.rows.length > 0;
  if (hasClientes || hasPromotor) {
    html += '<div class="fs-cliente-promotor">';
    if (hasClientes) {
      const minH = Math.max(280, clientesEntries.length * 26 + 60);
      html += '<div class="chart-box"><h3>🏪 Floor Share Drean por cliente</h3>' +
        '<div class="chart-wrap" style="height:' + minH + 'px"><canvas id="fsChClientes"></canvas></div></div>';
    }
    if (hasPromotor) {
      html += fsRenderPromotorTableHtml(promotorTable);
    }
    html += '</div>';
  }

  // Tabla detallada por tienda
  html += '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
    '<h3 style="font-size:14px;">📋 Detalle por tienda</h3>' +
    '<button class="upload-btn" id="fsBtnExport" style="background:#10b981;">📥 Exportar CSV</button>' +
    '</div><div class="table-wrap"><table id="fsTablaDet"><thead><tr>' +
    '<th data-sort="cliente">Cliente</th>' +
    '<th data-sort="storeName">Tienda</th>' +
    '<th data-sort="totalExh">Total piso</th>' +
    '<th data-sort="dreanExh">Drean</th>' +
    '<th data-sort="fsDrean">FS Drean</th>' +
    '<th data-sort="target">Objetivo</th>' +
    '<th data-sort="desvio">Desvío</th>' +
    '</tr></thead><tbody id="fsTBody"></tbody></table></div></div>';

  cont.innerHTML = html;

  fsRenderRanking(data);
  if (monthsInScope.length > 1) fsRenderEvolucion();
  if (clientesEntries.length > 0) fsRenderClientes(clientesEntries);
  fsRenderTabla(data);
  fsAttachExport(data);
  fsAttachTablaSort(data);
}

// Calcula FS Drean por cliente, ordenado descendente. Excluye "Sin asignar" si
// hubiese para que no entre en el ranking visual.
function fsBuildClienteShares(rows) {
  const map = {};
  rows.forEach(r => {
    const cli = r.cliente || 'Sin asignar';
    if (!map[cli]) map[cli] = { totalUnits: 0, dreanUnits: 0 };
    if ((r.brand || '').toLowerCase() === 'total') {
      map[cli].totalUnits += r.units || 0;
    } else {
      if (r.brand === FS_DREAN) map[cli].dreanUnits += r.units || 0;
      // si no hay fila "Total", reconstruimos total sumando todas las marcas
      if (!map[cli]._hasTotal) map[cli]._sumByBrand = (map[cli]._sumByBrand || 0) + (r.units || 0);
    }
    if ((r.brand || '').toLowerCase() === 'total') map[cli]._hasTotal = true;
  });
  const out = [];
  Object.keys(map).forEach(cli => {
    const m = map[cli];
    const total = m._hasTotal ? m.totalUnits : m._sumByBrand || 0;
    if (total <= 0) return;
    if (cli === 'Sin asignar') return;
    out.push({ cliente: cli, share: (m.dreanUnits / total) * 100, dreanUnits: m.dreanUnits, totalUnits: total });
  });
  out.sort((a, b) => b.share - a.share);
  return out;
}

function fsRenderClientes(entries) {
  const ctx = document.getElementById('fsChClientes');
  if (!ctx || entries.length === 0) return;
  const labels = entries.map(e => e.cliente);
  const values = entries.map(e => (Math.round(e.share * 10) / 10));
  fsCharts.push(new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'FS Drean %', data: values, backgroundColor: FS_DREAN_COLOR }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      layout: { padding: { right: 50 } },
      scales: { x: { beginAtZero: true, ticks: { callback: v => v + '%' } } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const e = entries[ctx.dataIndex];
              const total = Math.round(e.totalUnits).toLocaleString('es-AR');
              const drean = Math.round(e.dreanUnits).toLocaleString('es-AR');
              return ctx.parsed.x.toFixed(1) + '% · ' + drean + ' / ' + total;
            }
          }
        }
      }
    },
    plugins: [valueLabelsPlugin('horizontal')]
  }));
}

function fsRenderRanking(rows) {
  const ctx = document.getElementById('fsChRanking');
  if (!ctx) return;
  const { byBrand, totalUnits } = fsSumUnitsByBrand(rows);
  const entries = Object.entries(byBrand)
    .filter(([b, u]) => u > 0 && b.toLowerCase() !== 'otros' && b.toLowerCase() !== 'total')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  if (entries.length === 0 || totalUnits === 0) return;

  const labels = entries.map(([b]) => b);
  const values = entries.map(([, u]) => (u / totalUnits) * 100);
  const colors = labels.map(b => b === FS_DREAN ? FS_DREAN_COLOR : '#3b82f6');

  fsCharts.push(new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Floor Share %', data: values.map(v => v.toFixed(1)), backgroundColor: colors }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      layout: { padding: { right: 50 } },
      scales: { x: { beginAtZero: true, ticks: { callback: v => v + '%' } } },
      plugins: { legend: { display: false } }
    },
    plugins: [valueLabelsPlugin('horizontal')]
  }));
}

// ============= PERFORMANCE POR PROMOTOR =============
const FS_CATEGORY_ORDER = ['lavado', 'refrigeracion', 'coccion'];

function fsComputeFS(rows) {
  let drean = 0, totalRow = 0, brandSum = 0;
  rows.forEach(r => {
    const u = r.units || 0;
    if ((r.brand || '').toLowerCase() === 'total') {
      totalRow += u;
    } else {
      brandSum += u;
      if (r.brand === FS_DREAN) drean += u;
    }
  });
  const total = totalRow > 0 ? totalRow : brandSum;
  return total > 0 ? (drean / total) * 100 : null;
}

function fsBuildPromotorTable() {
  // Respetamos todos los filtros menos promotor (queremos verlos a todos).
  // Mes se respeta si está seteado; si no, se agrega todo el período.
  const data = fsApplyFilters(fsData, { promotor: true });
  if (data.length === 0) return null;

  // Categorías a mostrar: orden fijo conocido + el resto al final
  const catsInData = [...new Set(data.map(r => r.category))];
  const cats = [
    ...FS_CATEGORY_ORDER.filter(c => catsInData.includes(c)),
    ...catsInData.filter(c => !FS_CATEGORY_ORDER.includes(c)).sort(),
  ];

  const promotores = [...new Set(
    data.map(r => r.promotor).filter(p => p && p !== 'Sin asignar')
  )].sort();

  const cellFor = (rs, promotor, cat) =>
    fsComputeFS(rs.filter(r => r.promotor === promotor && r.category === cat));

  const rows = promotores.map(p => {
    const byCat = {};
    cats.forEach(cat => {
      const curr = cellFor(data, p, cat);
      const target = fsTargetFor(cat);
      const delta = (curr !== null && target !== null) ? curr - target : null;
      byCat[cat] = { curr, delta };
    });
    return { promotor: p, byCat };
  });

  const totalByCat = {};
  cats.forEach(cat => {
    const curr = fsComputeFS(data.filter(r => r.category === cat));
    const target = fsTargetFor(cat);
    const delta = (curr !== null && target !== null) ? curr - target : null;
    totalByCat[cat] = { curr, delta };
  });

  // Etiqueta de scope para el subtítulo
  const f = fsGetFilters();
  const months = [...new Set(data.map(r => r.month))].sort();
  let scopeLabel = '';
  if (f.mes) scopeLabel = fsMonthLabel(f.mes);
  else if (months.length === 1) scopeLabel = fsMonthLabel(months[0]);
  else if (months.length > 1) scopeLabel = fsMonthLabel(months[0]) + ' — ' + fsMonthLabel(months[months.length - 1]);

  return { rows, total: totalByCat, cats, scopeLabel };
}

function fsCellClass(value, target) {
  if (value === null || target === null) return 'fs-cell-na';
  const delta = value - target;
  if (delta >= -2) return 'fs-cell-green';
  if (delta >= -6) return 'fs-cell-yellow';
  return 'fs-cell-red';
}

function fsArrow(delta) {
  if (delta === null) return '';
  if (Math.abs(delta) < 0.005) return '<span class="fs-arrow-eq">=</span>';
  if (delta > 0) return '<span class="fs-arrow-up">↑</span>';
  return '<span class="fs-arrow-down">↓</span>';
}

function fsFmtCellPct(v) {
  if (v === null) return '—';
  return (Math.round(v * 100) / 100).toFixed(2).replace('.', ',') + ' %';
}

function fsFmtDelta(d) {
  if (d === null) return '';
  const v = Math.round(d * 100) / 100;
  if (Math.abs(v) < 0.005) return '0,00 pp';
  return (v >= 0 ? '+' : '') + v.toFixed(2).replace('.', ',') + ' pp';
}

function fsRenderPromotorTableHtml(t) {
  const subtitle = (t.scopeLabel ? t.scopeLabel + ' · ' : '') + 'Δ vs objetivo';

  let html = '<div class="card fs-promotor-card">' +
    '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;gap:8px;flex-wrap:wrap;">' +
    '<h3 style="font-size:14px;">👥 Performance por promotor</h3>' +
    '<span style="font-size:11px;color:#64748b;">' + escapeHtml(subtitle) + '</span>' +
    '</div>' +
    '<div class="table-wrap"><table class="fs-promotor-table"><thead><tr>' +
    '<th class="fs-pt-name">Promotor</th>';
  t.cats.forEach(cat => {
    html += '<th class="fs-pt-cat" colspan="2">FS ' + escapeHtml(fsTitleCase(cat).toUpperCase()) + '</th>';
  });
  html += '</tr></thead><tbody>';

  t.rows.forEach(row => {
    html += '<tr><td class="fs-pt-name">' + escapeHtml(row.promotor) + '</td>';
    t.cats.forEach(cat => {
      const c = row.byCat[cat];
      const cls = fsCellClass(c.curr, fsTargetFor(cat));
      html += '<td class="' + cls + ' fs-pt-pct">' + fsFmtCellPct(c.curr) + '</td>' +
        '<td class="fs-pt-delta">' + fsFmtDelta(c.delta) + ' ' + fsArrow(c.delta) + '</td>';
    });
    html += '</tr>';
  });

  // Total row
  html += '<tr class="fs-pt-total"><td class="fs-pt-name">FLOORSHARE TOTAL EQUIPO</td>';
  t.cats.forEach(cat => {
    const c = t.total[cat];
    const cls = fsCellClass(c.curr, fsTargetFor(cat));
    html += '<td class="' + cls + ' fs-pt-pct">' + fsFmtCellPct(c.curr) + '</td>' +
      '<td class="fs-pt-delta">' + fsFmtDelta(c.delta) + ' ' + fsArrow(c.delta) + '</td>';
  });
  html += '</tr>';

  html += '</tbody></table></div></div>';
  return html;
}

const FS_BRAND_PALETTE = ['#3b82f6','#f59e0b','#10b981','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#a855f7','#14b8a6'];

function fsRenderEvolucion() {
  const ctx = document.getElementById('fsChEvol');
  if (!ctx) return;
  const dataNoMes = fsApplyFilters(fsData, { mes: true });

  // Top 9 marcas (Drean siempre se muestra, total 10 series)
  const brandUnits = {};
  dataNoMes.forEach(r => {
    const b = r.brand;
    if (!b) return;
    const bl = b.toLowerCase();
    if (bl === 'total' || bl === 'otros') return;
    if (b === FS_DREAN) return;
    brandUnits[b] = (brandUnits[b] || 0) + (r.units || 0);
  });
  const topBrands = Object.entries(brandUnits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 9)
    .map(([b]) => b);

  const byMonth = {};
  dataNoMes.forEach(r => {
    if (!byMonth[r.month]) byMonth[r.month] = [];
    byMonth[r.month].push(r);
  });
  const months = Object.keys(byMonth).sort();
  const labels = months.map(fsMonthLabel);

  const datasets = [];
  // Drean en primer plano, destacado
  datasets.push({
    label: 'Drean',
    data: months.map(m => {
      const v = fsBrandShare(byMonth[m], FS_DREAN);
      return v === null ? null : Math.round(v * 10) / 10;
    }),
    borderColor: FS_DREAN_COLOR,
    backgroundColor: FS_DREAN_COLOR + '30',
    borderWidth: 3,
    pointRadius: 4,
    pointHoverRadius: 6,
    tension: 0.25,
    fill: false,
    order: 0,
  });
  topBrands.forEach((brand, i) => {
    datasets.push({
      label: brand,
      data: months.map(m => {
        const v = fsBrandShare(byMonth[m], brand);
        return v === null ? null : Math.round(v * 10) / 10;
      }),
      borderColor: FS_BRAND_PALETTE[i % FS_BRAND_PALETTE.length],
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      pointRadius: 2,
      tension: 0.25,
      fill: false,
      order: 1,
    });
  });

  fsCharts.push(new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { callback: v => v + '%' } } },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { mode: 'index', intersect: false }
      },
      interaction: { mode: 'nearest', axis: 'x', intersect: false }
    }
  }));
}

function fsBuildTablaRows(rows) {
  const map = {};
  rows.forEach(r => {
    const key = r.storeNumber + '||' + r.storeName;
    if (!map[key]) {
      map[key] = {
        storeNumber: r.storeNumber, storeName: r.storeName,
        cliente: r.cliente, supervisor: r.supervisor, promotor: r.promotor,
        totalExh: 0, dreanExh: 0, brandExh: {},
        catTotalRow: {}, catBrandSum: {},
      };
    }
    const row = map[key];
    if (r.brand.toLowerCase() === 'total') {
      row.totalExh += r.units || 0;
      row.catTotalRow[r.category] = (row.catTotalRow[r.category] || 0) + (r.units || 0);
    } else {
      row.brandExh[r.brand] = (row.brandExh[r.brand] || 0) + (r.units || 0);
      if (r.brand === FS_DREAN) row.dreanExh += r.units || 0;
      row.catBrandSum[r.category] = (row.catBrandSum[r.category] || 0) + (r.units || 0);
    }
  });
  return Object.values(map).map(row => {
    if (row.totalExh === 0) {
      row.totalExh = Object.values(row.brandExh).reduce((a, b) => a + b, 0);
    }
    row.fsDrean = row.totalExh > 0 ? (row.dreanExh / row.totalExh) * 100 : 0;
    // Target ponderado por unidades: sum(target[cat] * units[cat]) / sum(units[cat])
    // sólo sobre categorías con target definido.
    const cats = new Set([...Object.keys(row.catTotalRow), ...Object.keys(row.catBrandSum)]);
    let weightedNum = 0, weightedDen = 0;
    cats.forEach(cat => {
      const t = fsTargetFor(cat);
      if (t === null) return;
      const u = row.catTotalRow[cat] || row.catBrandSum[cat] || 0;
      if (u <= 0) return;
      weightedNum += t * u;
      weightedDen += u;
    });
    row.target = weightedDen > 0 ? weightedNum / weightedDen : null;
    row.desvio = (row.target !== null) ? (row.fsDrean - row.target) : null;
    return row;
  });
}

function fsRenderTabla(rows) {
  const tbody = document.getElementById('fsTBody');
  if (!tbody) return;
  const tabla = fsBuildTablaRows(rows);
  tabla.sort((a, b) => {
    const va = a[fsSortKey], vb = b[fsSortKey];
    if (typeof va === 'string') return fsSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    return fsSortDir === 'asc' ? (va || 0) - (vb || 0) : (vb || 0) - (va || 0);
  });
  if (tabla.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:20px;">Sin datos</td></tr>';
    return;
  }
  tbody.innerHTML = tabla.map(r => {
    const targetTxt = r.target !== null ? (Math.round(r.target * 10) / 10).toFixed(1) + '%' : '—';
    let desvioHtml = '<span style="color:#94a3b8">—</span>';
    if (r.desvio !== null) {
      const cls = r.desvio >= 0 ? 'fs-delta-pos' : 'fs-delta-neg';
      const txt = (r.desvio >= 0 ? '+' : '') + (Math.round(r.desvio * 10) / 10).toFixed(1) + ' pp';
      desvioHtml = '<span class="fs-delta-pill ' + cls + '">' + txt + '</span>';
    }
    return '<tr>' +
      '<td>' + escapeHtml(r.cliente || '—') + '</td>' +
      '<td>' + escapeHtml(r.storeNumber ? (r.storeNumber + ' - ' + r.storeName) : r.storeName) + '</td>' +
      '<td>' + Math.round(r.totalExh).toLocaleString('es-AR') + '</td>' +
      '<td>' + Math.round(r.dreanExh).toLocaleString('es-AR') + '</td>' +
      '<td><span class="pct ' + pctClass(r.fsDrean) + '">' + fmtPctFs(r.fsDrean) + '</span></td>' +
      '<td>' + targetTxt + '</td>' +
      '<td>' + desvioHtml + '</td>' +
      '</tr>';
  }).join('');
}

function fsAttachTablaSort(rows) {
  document.querySelectorAll('#fsTablaDet th').forEach(th => {
    th.addEventListener('click', () => {
      const k = th.dataset.sort;
      if (fsSortKey === k) fsSortDir = fsSortDir === 'asc' ? 'desc' : 'asc';
      else { fsSortKey = k; fsSortDir = 'desc'; }
      fsRenderTabla(rows);
    });
  });
}

function fsAttachExport(rows) {
  const btn = document.getElementById('fsBtnExport');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const tabla = fsBuildTablaRows(rows);
    const headers = ['Cliente', 'Numero', 'Tienda', 'Supervisor', 'Promotor', 'Total piso', 'Drean exhibido', 'FS Drean %', 'Objetivo %', 'Desvío pp'];
    const lines = [headers.join(';')];
    const fmtNum = v => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
    tabla.forEach(r => {
      lines.push([
        '"' + (r.cliente || '').replace(/"/g, '""') + '"',
        r.storeNumber,
        '"' + (r.storeName || '').replace(/"/g, '""') + '"',
        '"' + (r.supervisor || '').replace(/"/g, '""') + '"',
        '"' + (r.promotor || '').replace(/"/g, '""') + '"',
        Math.round(r.totalExh),
        Math.round(r.dreanExh),
        fmtNum(r.fsDrean),
        r.target !== null ? fmtNum(r.target) : '',
        r.desvio !== null ? fmtNum(r.desvio) : '',
      ].join(';'));
    });
    const csv = '﻿' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'floor-share-detalle-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// ============= INIT FLOOR SHARE (listeners + render inicial) =============
function initFSControls() {
['fsMes','fsCategoria','fsSupervisor','fsPromotor','fsCliente','fsTienda'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('change', () => { fsPopulateFilters(); fsRender(); });
});

const fsBtnReset = document.getElementById('fsBtnReset');
if (fsBtnReset) {
  fsBtnReset.addEventListener('click', () => {
    ['fsMes','fsCategoria','fsSupervisor','fsPromotor','fsCliente','fsTienda'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    fsPopulateFilters();
    fsRender();
  });
}

if (fsData.length > 0) fsPopulateFilters();
fsRender();
}

// ============= TABS =============
function initTabs() {
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach(b => {
      const active = b.dataset.tab === target;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('.tab-panel').forEach(p => {
      const active = p.id === 'tab-' + target;
      p.classList.toggle('active', active);
      if (active) p.removeAttribute('hidden');
      else p.setAttribute('hidden', '');
    });
  });
});
}

// ============= SHELL HTML =============
function buildShell() {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `
    <h1>Dashboard Trade Marketing</h1>
    <div class="sub">Análisis multi-semana · CB · Infaltables · Estratégico · Floor Share</div>

    <div class="tabs" role="tablist">
      <button class="tab active" data-tab="cb" role="tab" aria-selected="true">Cumplimiento CB</button>
      <button class="tab" data-tab="floorshare" role="tab" aria-selected="false">Floor Share</button>
    </div>

    <section id="tab-cb" class="tab-panel active">
      <div class="card upload-card">
        <div class="upload-row">
          <input type="file" id="fileInput" accept=".csv" multiple style="display:none" />
          <button class="upload-btn">+ Sumar semana(s)</button>
          <button class="upload-btn" id="btnExport" style="background:#10b981">📥 Exportar HTML con datos</button>
          <div class="upload-info" id="dataInfo"></div>
          <div id="semanasBadges" style="margin-left:auto"></div>
        </div>
      </div>

      <div class="card">
        <div class="filters">
          <div><label>Mes</label><select id="fMes"><option value="">Todos</option></select></div>
          <div><label>Semana</label><select id="fSemana"><option value="">Todos</option></select></div>
          <div><label>Categoría</label><select id="fDivision"><option value="">Todos</option></select></div>
          <div><label>Supervisor</label><select id="fSupervisor"><option value="">Todos</option></select></div>
          <div><label>Promotor</label><select id="fPromotor"><option value="">Todos</option></select></div>
          <div><label>Cliente / Cadena</label><select id="fCliente"><option value="">Todos</option></select></div>
          <div><label>Tienda</label><select id="fTienda"><option value="">Todos</option></select></div>
          <button class="reset-btn" id="btnReset">↺ Limpiar</button>
        </div>
      </div>

      <div id="content"></div>
    </section>

    <section id="tab-floorshare" class="tab-panel" hidden>
      <div class="card">
        <div class="filters filters-fs">
          <div><label>Mes</label><select id="fsMes"><option value="">Todos</option></select></div>
          <div><label>Categoría</label><select id="fsCategoria"><option value="">Todas</option></select></div>
          <div><label>Supervisor</label><select id="fsSupervisor"><option value="">Todos</option></select></div>
          <div><label>Promotor</label><select id="fsPromotor"><option value="">Todos</option></select></div>
          <div><label>Cliente / Cadena</label><select id="fsCliente"><option value="">Todos</option></select></div>
          <div><label>Tienda</label><select id="fsTienda"><option value="">Todas</option></select></div>
          <button class="reset-btn" id="fsBtnReset">↺ Limpiar</button>
        </div>
      </div>

      <div id="fsContent"></div>
    </section>
  `;
}

function showLoader() {
  const root = document.getElementById('root');
  if (root) root.innerHTML = '<div class="card empty">⏳ Cargando dashboard…</div>';
}

function showError(msg) {
  const root = document.getElementById('root');
  if (root) root.innerHTML = '<div class="card empty">⚠️ ' + escapeHtml(msg) + '</div>';
}

function applyDataset(data) {
  allData = Array.isArray(data && data.rows) ? data.rows : [];
  semanasCargadas = new Set(Array.isArray(data && data.semanas) ? data.semanas : []);
  fsData = (data && data.floorShare && Array.isArray(data.floorShare.rows)) ? data.floorShare.rows : [];
  window.__DATA__ = data || null;
  window.__PRELOADED_FLOORSHARE__ = (data && data.floorShare) || null;
}

async function boot() {
  // Modo "viewer offline": HTML exportado con datos pre-embebidos
  const hasPreloaded = typeof window.__PRELOADED_DATA__ !== 'undefined' && Array.isArray(window.__PRELOADED_DATA__);
  if (hasPreloaded) {
    applyDataset({
      rows: window.__PRELOADED_DATA__,
      semanas: Array.isArray(window.__PRELOADED_SEMANAS__) ? window.__PRELOADED_SEMANAS__ : [],
      floorShare: window.__PRELOADED_FLOORSHARE__ || null,
    });
    buildShell();
    initCBControls();
    initFSControls();
    initTabs();
    return;
  }

  showLoader();
  let data;
  try {
    const res = await fetch('/api/data', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    data = await res.json();
  } catch (err) {
    showError('No se pudo cargar el dataset: ' + (err && err.message ? err.message : err));
    return;
  }
  if (data && data.error) {
    showError(data.error);
    return;
  }

  applyDataset(data);

  if (allData.length === 0 && fsData.length === 0) {
    showError('No se encontraron CSVs con datos en la carpeta de Drive.');
    return;
  }

  buildShell();
  initCBControls();
  initFSControls();
  initTabs();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
