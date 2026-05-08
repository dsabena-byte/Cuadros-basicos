// Genera data/ventas.json con ventas simuladas a partir del CB y la
// clasificación reales. Cada cliente arma 1-3 pedidos; cada (pedido, sku)
// del CB cae en uno de tres estados (FC 100% / BO 100% / split FC+BO),
// asegurando que los porcentajes de cumplimiento sean realistas (~70-85%).
//
// Esto es sólo para desarrollo local. En producción `ventas.json` lo escribe
// POST /api/ventas con el payload del flow de Power Automate.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "..", "data");
mkdirSync(outDir, { recursive: true });

const cuadroBasico = JSON.parse(readFileSync(resolve(outDir, "cuadro-basico.json"), "utf8"));
const clasificacion = JSON.parse(readFileSync(resolve(outDir, "clasificacion-clientes.json"), "utf8"));

const vendedorPorCliente = new Map(clasificacion.map((c) => [c.cliente, c.vendedor]));
const skusPorCliente = new Map();
for (const item of cuadroBasico) {
  if (!skusPorCliente.has(item.cliente)) skusPorCliente.set(item.cliente, new Set());
  skusPorCliente.get(item.cliente).add(item.sku);
}

const seed = (n) => {
  let s = n >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
};
const rand = seed(2026);
const between = (a, b) => Math.floor(rand() * (b - a + 1)) + a;

const hoy = new Date("2026-05-08");
const ventas = [];
let docCounter = 80000000;

for (const [cliente, skuSet] of skusPorCliente) {
  const skus = [...skuSet];
  const vendedor = vendedorPorCliente.get(cliente) ?? "—";
  const numPedidos = between(1, 3);

  for (let p = 0; p < numPedidos; p++) {
    docCounter += 1;
    const documentoVentas = String(docCounter);
    const fechaPedido = new Date(hoy);
    fechaPedido.setDate(fechaPedido.getDate() - between(0, 110));
    const fechaPedidoStr = fechaPedido.toISOString().slice(0, 10);
    const mes = fechaPedido.getMonth() + 1;

    // Cada pedido cubre un subconjunto de los SKUs del CB del cliente.
    const cubiertos = new Set();
    const targetCobertura = Math.min(skus.length, between(2, Math.max(2, Math.ceil(skus.length * 0.6))));
    while (cubiertos.size < targetCobertura) {
      cubiertos.add(skus[between(0, skus.length - 1)]);
    }

    for (const sku of cubiertos) {
      const total = between(2, 60);
      const r = rand();
      let fcUnits = 0;
      let boUnits = 0;
      if (r < 0.6) fcUnits = total;
      else if (r < 0.85) boUnits = total;
      else {
        fcUnits = Math.max(1, Math.floor(total * (0.3 + rand() * 0.5)));
        boUnits = total - fcUnits;
      }

      if (fcUnits > 0) {
        ventas.push({
          documentoVentas, cliente, sku, tipo: "FC",
          unidades: fcUnits, fecha: fechaPedidoStr, mes, vendedor,
        });
      }
      if (boUnits > 0) {
        ventas.push({
          documentoVentas, cliente, sku, tipo: "BO",
          unidades: boUnits, fecha: fechaPedidoStr, mes, vendedor,
        });
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
console.log(`ventas dummy: ${ventas.length} filas (${fc} FC + ${bo} BO) en ${docs.size} pedidos / ${skusPorCliente.size} clientes`);
