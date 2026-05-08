// Toma data/ventas.json (las 2560 filas dummy) y las POSTea al endpoint
// /api/ventas en el formato {fc, bo} que espera el server. Útil para
// poblar el Vercel Blob de un preview/staging antes de tener el flow
// real de Power Automate corriendo.
//
// Uso (PowerShell):
//   $env:VENTAS_URL="https://<deploy>.vercel.app/api/ventas"
//   $env:REFRESH_SECRET1="<secret>"
//   $env:VERCEL_BYPASS="<bypass-token>"   # solo si el deploy está protegido
//   node scripts/post-dummy-ventas.mjs

import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "data", "ventas.json");
const URL = process.env.VENTAS_URL;
const SECRET = process.env.REFRESH_SECRET1;
const BYPASS = process.env.VERCEL_BYPASS;

if (!URL || !SECRET) {
  console.error("Falta VENTAS_URL o REFRESH_SECRET1 en el environment.");
  process.exit(1);
}

const src = JSON.parse(fs.readFileSync(SRC, "utf8"));
const strip = (r) => ({
  documentoVentas: r.documentoVentas,
  cliente: r.cliente,
  sku: r.sku,
  unidades: r.unidades,
  fecha: r.fecha,
  vendedor: r.vendedor,
});
const fc = src.rows.filter((r) => r.tipo === "FC").map(strip);
const bo = src.rows.filter((r) => r.tipo === "BO").map(strip);
const payload = { fc, bo, generatedAt: src.generatedAt };

console.log(`POST → ${URL}`);
console.log(`Filas: ${fc.length} FC + ${bo.length} BO = ${fc.length + bo.length} (${src.rows.length} en el dummy)`);

const headers = {
  "Content-Type": "application/json",
  "x-refresh-secret": SECRET,
};
if (BYPASS) headers["x-vercel-protection-bypass"] = BYPASS;

const res = await fetch(URL, {
  method: "POST",
  headers,
  body: JSON.stringify(payload),
});
const text = await res.text();
console.log("Status:", res.status);
console.log("Body:", text);
process.exit(res.ok ? 0 : 1);
