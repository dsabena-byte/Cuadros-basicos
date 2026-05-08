// Generates the static JSON data files in /public/data/.
//
// Replace these later with:
//   - /public/data/cuadro-basico.json         ← Cuadros-basicos-Abril-2026.csv (Drive)
//   - /public/data/clasificacion-clientes.json ← Clasificacion-clientes-Abril-2026.csv (Drive)
//   - /public/data/ventas.json                 ← lo escribe POST /api/ventas (Power Automate)
//
// Para ventas modelamos pedidos identificados por `documentoVentas`. Un
// pedido puede tener varias líneas (cliente + SKU). Cada línea puede estar
// 100% facturada (sólo FC), 100% pendiente (sólo BO) o split (FC + BO).
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

// ---------- Ventas dummy (FC + BO con Documento de Ventas) ----------
//
// Modelo: cada cliente arma N pedidos (3-6). Cada pedido tiene un
// `documentoVentas` único y entre 2 y 5 líneas (SKU). Cada línea cae en uno
// de tres estados:
//   - 100% FC  (60%)   → fila sólo en FC
//   - 100% BO  (25%)   → fila sólo en BO
//   - SPLIT    (15%)   → una fila en FC y otra en BO con el mismo
//                        documentoVentas + sku, sumando el total del pedido
const hoy = new Date("2026-05-08");
const seed = (n) => {
  let s = n >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
};
const rand = seed(42);
const between = (a, b) => Math.floor(rand() * (b - a + 1)) + a;
const pickWeighted = () => {
  const r = rand();
  if (r < 0.6) return "FC";
  if (r < 0.85) return "BO";
  return "SPLIT";
};

const ventas = [];
let docCounter = 80000000;

for (const cliente of clientesUnicos) {
  const skusCliente = cuadroBasico.filter((c) => c.cliente === cliente).map((c) => c.sku);
  if (skusCliente.length === 0) continue;
  const vendedor = clasificacion.find((c) => c.cliente === cliente).vendedor;
  const numPedidos = between(3, 6);

  for (let p = 0; p < numPedidos; p++) {
    docCounter += 1;
    const documentoVentas = String(docCounter);
    const fechaPedido = new Date(hoy);
    fechaPedido.setDate(fechaPedido.getDate() - between(0, 110));
    const fechaPedidoStr = fechaPedido.toISOString().slice(0, 10);

    const skusPedido = [...new Set(
      Array.from({ length: between(2, 5) }, () => skusCliente[between(0, skusCliente.length - 1)]),
    )];

    for (const sku of skusPedido) {
      const total = between(2, 60);
      const estado = pickWeighted();

      if (estado === "FC") {
        ventas.push({
          documentoVentas, cliente, sku, tipo: "FC",
          unidades: total, fecha: fechaPedidoStr,
          mes: fechaPedido.getMonth() + 1, vendedor,
        });
      } else if (estado === "BO") {
        ventas.push({
          documentoVentas, cliente, sku, tipo: "BO",
          unidades: total, fecha: fechaPedidoStr,
          mes: fechaPedido.getMonth() + 1, vendedor,
        });
      } else {
        const fcUnits = Math.max(1, Math.floor(total * (0.3 + rand() * 0.5)));
        const boUnits = total - fcUnits;
        ventas.push({
          documentoVentas, cliente, sku, tipo: "FC",
          unidades: fcUnits, fecha: fechaPedidoStr,
          mes: fechaPedido.getMonth() + 1, vendedor,
        });
        if (boUnits > 0) {
          ventas.push({
            documentoVentas, cliente, sku, tipo: "BO",
            unidades: boUnits, fecha: fechaPedidoStr,
            mes: fechaPedido.getMonth() + 1, vendedor,
          });
        }
      }
    }
  }
}

const ventasFile = {
  generatedAt: new Date().toISOString(),
  source: "dummy",
  rows: ventas,
};

writeFileSync(resolve(outDir, "ventas.json"), JSON.stringify(ventasFile, null, 2));

const docs = new Set(ventas.map((v) => v.documentoVentas));
const fc = ventas.filter((v) => v.tipo === "FC").length;
const bo = ventas.filter((v) => v.tipo === "BO").length;
console.log(
  `cuadro-basico: ${cuadroBasico.length} · clasificacion: ${clasificacion.length} clientes · ventas: ${ventas.length} filas (${fc} FC + ${bo} BO) en ${docs.size} pedidos`,
);
