// Convierte los CSVs reales de Drive (carpeta Tablero CB / cuadro-basico-ventas)
// a los JSON estáticos que consume el dashboard.
//
//   raw-data/Cuadros-basicos-Abril-2026.csv        → data/cuadro-basico.json
//   raw-data/Clasificacion-clientes-Abril-2026.csv → data/clasificacion-clientes.json
//
// Encoding de los CSV: ISO-8859-1 (Windows-1252). Hay que decodificar con
// TextDecoder("latin1") para que `PE�ALVA` salga como `PEÑALVA`.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const rawDir = resolve(repoRoot, "raw-data");
const outDir = resolve(repoRoot, "data");
mkdirSync(outDir, { recursive: true });

const decoder = new TextDecoder("latin1");

function readCsv(filename) {
  const buf = readFileSync(resolve(rawDir, filename));
  const text = decoder.decode(buf).replace(/\r\n/g, "\n").trim();
  const [header, ...lines] = text.split("\n");
  const cols = header.split(";").map((c) => c.trim());
  return lines.filter((l) => l.length > 0).map((line) => {
    const cells = line.split(";");
    const row = {};
    for (let i = 0; i < cols.length; i++) row[cols[i]] = (cells[i] ?? "").trim();
    return row;
  });
}

const TIPOLOGIA_NORMALIZER = {
  "GRANDES CUENTAS TOP 10": "TOP 10",
  "GRANDES CUENTAS RESTO": "GRANDES CUENTAS RESTO",
  "GRANDES CUENTAS RESTO (46 CLIENTES)": "GRANDES CUENTAS RESTO",
  "HIPERMERCADOS": "HIPERMERCADOS",
  "SMALL RETAILERS": "SMALL RETAILERS",
};

function normTipologia(raw) {
  const t = raw.trim().toUpperCase();
  if (TIPOLOGIA_NORMALIZER[t]) return TIPOLOGIA_NORMALIZER[t];
  for (const [key, val] of Object.entries(TIPOLOGIA_NORMALIZER)) {
    if (t.startsWith(key)) return val;
  }
  return null;
}

function parsePeso(s) {
  // "10,19%" → 0.1019
  const m = s.replace(/\s/g, "").replace(",", ".").replace("%", "");
  const n = Number(m);
  return Number.isFinite(n) ? n / 100 : 0;
}

// ---------- Clasificación ----------
const clasifRows = readCsv("Clasificacion-clientes-Abril-2026.csv");
const clasificacion = clasifRows.map((r) => {
  const tip = normTipologia(r.TIPOLOGIA ?? "");
  return {
    id: r.ID,
    cliente: r.CLIENTE,
    pesoFacturacion: parsePeso(r["PESO FACTURACION"] ?? "0"),
    tipologia: tip,
    vendedor: r.VENDEDOR,
    gerente: r.GERENCIA,
  };
}).filter((c) => c.tipologia !== null);

const tipoPorCliente = new Map(clasificacion.map((c) => [c.cliente, c.tipologia]));
const clientesPorTipologia = new Map();
for (const c of clasificacion) {
  if (!clientesPorTipologia.has(c.tipologia)) clientesPorTipologia.set(c.tipologia, []);
  clientesPorTipologia.get(c.tipologia).push(c.cliente);
}

writeFileSync(
  resolve(outDir, "clasificacion-clientes.json"),
  JSON.stringify(clasificacion, null, 2),
);

// ---------- Cuadro básico ----------
const cbRows = readCsv("Cuadros-basicos-Abril-2026.csv");

// Por TOP 10 las filas tienen cliente explícito; para el resto el cliente
// viene vacío y la regla aplica a todos los clientes de esa tipología
// (según clasificacion-clientes).
const cuadroBasico = [];
const warningsTop10SinCB = new Set();
const warningsTipologiaSinClientes = new Set();

for (const r of cbRows) {
  const tipologia = normTipologia(r.TIPOLOGIA);
  if (!tipologia) continue;
  const cb = (r["CUADRO BASICO"] ?? "").trim().toUpperCase();
  if (cb !== "INFALTABLE" && cb !== "ESTRATEGICO") continue;
  const categoria = (r.CATEGORIA ?? "").trim().toUpperCase();
  if (!["LAVADO", "REFRIGERACION", "COCCION"].includes(categoria)) continue;
  const sku = (r.MODELO ?? "").trim();
  if (!sku) continue;
  const clienteExplicito = (r.CLIENTE ?? "").trim();

  if (clienteExplicito) {
    // TOP 10 con cliente puntual
    cuadroBasico.push({ tipologia, cliente: clienteExplicito, tipo: cb, categoria, sku });
  } else {
    // Resto / Hipermercados / Small Retailers — expandir a todos los
    // clientes de esa tipología.
    const clientes = clientesPorTipologia.get(tipologia) ?? [];
    if (clientes.length === 0) {
      warningsTipologiaSinClientes.add(tipologia);
      continue;
    }
    for (const cli of clientes) {
      cuadroBasico.push({ tipologia, cliente: cli, tipo: cb, categoria, sku });
    }
  }
}

// Verificar TOP 10 que no tienen CB explícito
for (const c of clasificacion) {
  if (c.tipologia === "TOP 10") {
    const tieneCB = cuadroBasico.some((x) => x.cliente === c.cliente);
    if (!tieneCB) warningsTop10SinCB.add(c.cliente);
  }
}

writeFileSync(resolve(outDir, "cuadro-basico.json"), JSON.stringify(cuadroBasico, null, 2));

// ---------- Reporte ----------
const stats = {
  clasificacion: clasificacion.length,
  porTipologia: {},
  cuadroBasico: cuadroBasico.length,
  cuadroBasicoPorTipologia: {},
};
for (const t of new Set(clasificacion.map((c) => c.tipologia))) {
  stats.porTipologia[t] = clasificacion.filter((c) => c.tipologia === t).length;
}
for (const t of new Set(cuadroBasico.map((c) => c.tipologia))) {
  stats.cuadroBasicoPorTipologia[t] = {
    items: cuadroBasico.filter((c) => c.tipologia === t).length,
    clientes: new Set(cuadroBasico.filter((c) => c.tipologia === t).map((c) => c.cliente)).size,
  };
}

console.log("Clasificación:", stats.clasificacion, "clientes");
for (const [t, n] of Object.entries(stats.porTipologia)) console.log(`  ${t}: ${n}`);
console.log("Cuadro básico:", stats.cuadroBasico, "filas");
for (const [t, info] of Object.entries(stats.cuadroBasicoPorTipologia)) {
  console.log(`  ${t}: ${info.items} filas / ${info.clientes} clientes`);
}
if (warningsTop10SinCB.size > 0) {
  console.log("\n⚠️  Clientes TOP 10 sin CB explícito (no aparecerán en el dashboard):");
  for (const c of warningsTop10SinCB) console.log(`   - ${c}`);
}
if (warningsTipologiaSinClientes.size > 0) {
  console.log("\n⚠️  Tipologías con CB definido pero sin clientes en clasificación:");
  for (const t of warningsTipologiaSinClientes) console.log(`   - ${t}`);
}
