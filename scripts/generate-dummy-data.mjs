// Generates the static JSON data files in /public/data/.
// Replace these later with output from the real Drive CSVs +
// the SharePoint workbook (FC + BO 2026 - Hanna.xlsx).
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "..", "public", "data");
mkdirSync(outDir, { recursive: true });

// ---------- Cuadro básico ----------
const top10Clients = [
  "ELECTRONICA MEGATONE SRL",
  "FRAVEGA S A C I E I",
  "CETROGAR SA",
  "NALDO LOMBARDI S A",
  "CASTILLO SACIFIA",
  "BLAS OSCAR MARTINUCCI E HIJOS S A",
  "BOSAN SA",
];

const grandesResto = [
  "MARANSI S A",
  "GARCIA HUGO ANIBAL",
  "SERVISTAN TV S R L",
  "CASA MARTIN DE C Y A",
  "ESMASA S.R.L.",
  "ELECTRO MISIONES S.A.",
  "GAITAN ROGELIO RUBEN",
  "RENNA MARIA ESTHER",
  "CIGNACCHI CLAUDIO LUIS",
  "BRANT BERNARDO Y ABRAHAM",
];

const hiper = [
  "CENCOSUD S.A. (JUMBO)",
  "INC S.A. (CARREFOUR)",
  "WALMART ARGENTINA SRL",
];

const smallRetail = [
  "HOGAMAR SA",
  "MARCOS S.A.",
  "TODO HOGAR S R L",
  "D Y D SRL",
  "HOGAR CONFORT SA",
  "MUSSI LUIS PABLO",
  "COLDAROLI HOGAR S.R.L.",
  "HOTZ JUAN E HIJOS SA",
];

const cuadroBasico = [
  ...top10Clients.flatMap((cliente) => [
    { tipologia: "TOP 10", cliente, tipo: "INFALTABLE", categoria: "LAVADO Y SECADO", sku: "LCFDR0608LB0" },
    { tipologia: "TOP 10", cliente, tipo: "INFALTABLE", categoria: "LAVADO Y SECADO", sku: "LCFDR0814SB0" },
    { tipologia: "TOP 10", cliente, tipo: "INFALTABLE", categoria: "LAVADO Y SECADO", sku: "LSDR0680TB0" },
    { tipologia: "TOP 10", cliente, tipo: "INFALTABLE", categoria: "REFRIGERACION", sku: "HDR400F41N" },
    { tipologia: "TOP 10", cliente, tipo: "INFALTABLE", categoria: "REFRIGERACION", sku: "HDR280F50B" },
    { tipologia: "TOP 10", cliente, tipo: "INFALTABLE", categoria: "REFRIGERACION", sku: "RZN320PCARX0" },
    { tipologia: "TOP 10", cliente, tipo: "INFALTABLE", categoria: "COCCION", sku: "CD5603AI0" },
    { tipologia: "TOP 10", cliente, tipo: "INFALTABLE", categoria: "COCCION", sku: "CD5602AN0" },
    { tipologia: "TOP 10", cliente, tipo: "ESTRATEGICO", categoria: "LAVADO Y SECADO", sku: "LFDR0710SB0" },
    { tipologia: "TOP 10", cliente, tipo: "ESTRATEGICO", categoria: "REFRIGERACION", sku: "DSP480LKRSS0" },
    { tipologia: "TOP 10", cliente, tipo: "ESTRATEGICO", categoria: "COCCION", sku: "CD5617AI0" },
  ]),
  ...grandesResto.flatMap((cliente) => [
    { tipologia: "GRANDES CUENTAS RESTO", cliente, tipo: "INFALTABLE", categoria: "LAVADO Y SECADO", sku: "LCFDR0608LB0" },
    { tipologia: "GRANDES CUENTAS RESTO", cliente, tipo: "INFALTABLE", categoria: "LAVADO Y SECADO", sku: "LCFDR0814SB0" },
    { tipologia: "GRANDES CUENTAS RESTO", cliente, tipo: "INFALTABLE", categoria: "LAVADO Y SECADO", sku: "LSDR0680TB0" },
    { tipologia: "GRANDES CUENTAS RESTO", cliente, tipo: "INFALTABLE", categoria: "REFRIGERACION", sku: "HDR280F50B" },
    { tipologia: "GRANDES CUENTAS RESTO", cliente, tipo: "INFALTABLE", categoria: "REFRIGERACION", sku: "HDR400F41E" },
    { tipologia: "GRANDES CUENTAS RESTO", cliente, tipo: "INFALTABLE", categoria: "REFRIGERACION", sku: "RZN320PCARX0" },
    { tipologia: "GRANDES CUENTAS RESTO", cliente, tipo: "INFALTABLE", categoria: "COCCION", sku: "CD5603AI0" },
    { tipologia: "GRANDES CUENTAS RESTO", cliente, tipo: "INFALTABLE", categoria: "COCCION", sku: "CD5602AB0" },
    { tipologia: "GRANDES CUENTAS RESTO", cliente, tipo: "ESTRATEGICO", categoria: "LAVADO Y SECADO", sku: "LCFDR1012SB0" },
    { tipologia: "GRANDES CUENTAS RESTO", cliente, tipo: "ESTRATEGICO", categoria: "COCCION", sku: "CD5617AI0" },
  ]),
  ...hiper.flatMap((cliente) => [
    { tipologia: "HIPERMERCADOS", cliente, tipo: "INFALTABLE", categoria: "LAVADO Y SECADO", sku: "LCFDR0814SB0" },
    { tipologia: "HIPERMERCADOS", cliente, tipo: "INFALTABLE", categoria: "LAVADO Y SECADO", sku: "LSDR0680TB0" },
    { tipologia: "HIPERMERCADOS", cliente, tipo: "INFALTABLE", categoria: "REFRIGERACION", sku: "HDR280F50B" },
    { tipologia: "HIPERMERCADOS", cliente, tipo: "INFALTABLE", categoria: "COCCION", sku: "CD5602AB0" },
    { tipologia: "HIPERMERCADOS", cliente, tipo: "ESTRATEGICO", categoria: "LAVADO Y SECADO", sku: "LCFDR1012SB0" },
    { tipologia: "HIPERMERCADOS", cliente, tipo: "ESTRATEGICO", categoria: "REFRIGERACION", sku: "RZN320PCARX0" },
    { tipologia: "HIPERMERCADOS", cliente, tipo: "ESTRATEGICO", categoria: "COCCION", sku: "CD5617AI0" },
  ]),
  ...smallRetail.flatMap((cliente) => [
    { tipologia: "SMALL RETAILERS", cliente, tipo: "INFALTABLE", categoria: "LAVADO Y SECADO", sku: "LCFDR0608LB0" },
    { tipologia: "SMALL RETAILERS", cliente, tipo: "INFALTABLE", categoria: "LAVADO Y SECADO", sku: "700200380" },
    { tipologia: "SMALL RETAILERS", cliente, tipo: "INFALTABLE", categoria: "REFRIGERACION", sku: "HDR280F50B" },
    { tipologia: "SMALL RETAILERS", cliente, tipo: "INFALTABLE", categoria: "REFRIGERACION", sku: "HDR370F61E" },
    { tipologia: "SMALL RETAILERS", cliente, tipo: "INFALTABLE", categoria: "COCCION", sku: "CD5602AB0" },
    { tipologia: "SMALL RETAILERS", cliente, tipo: "INFALTABLE", categoria: "COCCION", sku: "CD5603AI0" },
    { tipologia: "SMALL RETAILERS", cliente, tipo: "ESTRATEGICO", categoria: "LAVADO Y SECADO", sku: "LCFDR1012SB0" },
    { tipologia: "SMALL RETAILERS", cliente, tipo: "ESTRATEGICO", categoria: "LAVADO Y SECADO", sku: "LCFDR0710SB0" },
    { tipologia: "SMALL RETAILERS", cliente, tipo: "ESTRATEGICO", categoria: "REFRIGERACION", sku: "RZN320PCARX0" },
    { tipologia: "SMALL RETAILERS", cliente, tipo: "ESTRATEGICO", categoria: "COCCION", sku: "CD5602AI0" },
  ]),
];

writeFileSync(resolve(outDir, "cuadro-basico.json"), JSON.stringify(cuadroBasico, null, 2));

// ---------- Clasificación de clientes ----------
const gerentePorVendedor = {
  "BARILLEAU RAUL": "GERENCIA NORTE",
  "PRESTA MARTIN": "GERENCIA NORTE",
  "PEÑALVA JORGE": "GERENCIA NORTE",
  "DALMATIA SA": "GERENCIA NORTE",
  "PIATTI MARCELO": "GERENCIA CENTRO",
  "BERTINI DAMIAN": "GERENCIA CENTRO",
  "FERREIRO CRISTIAN": "GERENCIA CENTRO",
  "POMBO MARCELO": "GERENCIA CENTRO",
  "OVEID JORGE Y NICOLAS": "GERENCIA SUR",
  "IGNACIO PAGADIZABAL": "GERENCIA SUR",
  "PUELLES LUIS": "GERENCIA SUR",
};
const vendedores = Object.keys(gerentePorVendedor);

const clientesUnicos = [...new Set(cuadroBasico.map((c) => c.cliente))];
const clasificacion = clientesUnicos.map((cliente, i) => {
  const vendedor = vendedores[i % vendedores.length];
  const item = cuadroBasico.find((c) => c.cliente === cliente);
  return {
    cliente,
    tipologia: item.tipologia,
    vendedor,
    gerente: gerentePorVendedor[vendedor],
  };
});

writeFileSync(
  resolve(outDir, "clasificacion-clientes.json"),
  JSON.stringify(clasificacion, null, 2),
);

// ---------- Ventas dummy (FC + BO) ----------
const hoy = new Date("2026-05-08");
const seed = (n) => {
  // deterministic LCG so the dummy file is stable between runs
  let s = n >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
};
const rand = seed(42);

const ventas = [];
for (const item of cuadroBasico) {
  const r = rand();
  const vendedor = clasificacion.find((c) => c.cliente === item.cliente).vendedor;
  if (r > 0.5) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - Math.floor(rand() * 90));
    ventas.push({
      cliente: item.cliente,
      sku: item.sku,
      tipo: "FC",
      unidades: Math.floor(rand() * 50) + 1,
      fecha: fecha.toISOString().slice(0, 10),
      mes: fecha.getMonth() + 1,
      vendedor,
    });
  }
  if (r > 0.4 && r <= 0.7) {
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - Math.floor(rand() * 30));
    ventas.push({
      cliente: item.cliente,
      sku: item.sku,
      tipo: "BO",
      unidades: Math.floor(rand() * 20) + 1,
      fecha: fecha.toISOString().slice(0, 10),
      mes: fecha.getMonth() + 1,
      vendedor,
    });
  }
}

const ventasFile = {
  generatedAt: new Date().toISOString(),
  source: "dummy",
  rows: ventas,
};

writeFileSync(resolve(outDir, "ventas.json"), JSON.stringify(ventasFile, null, 2));

console.log(
  `cuadro-basico.json: ${cuadroBasico.length} rows · clasificacion: ${clasificacion.length} clientes · ventas: ${ventas.length} rows`,
);
