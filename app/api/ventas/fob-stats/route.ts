import { NextResponse } from "next/server";
import { readVentas } from "@/lib/storage";
import { withCors, corsPreflight } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = () => corsPreflight();

function checkSecret(request: Request): boolean {
  const expected = process.env.REFRESH_SECRET1;
  if (!expected) return false;
  const url = new URL(request.url);
  const provided =
    request.headers.get("x-refresh-secret") ?? url.searchParams.get("secret") ?? "";
  return provided === expected;
}

function unauthorized() {
  return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
}

// GET /api/ventas/fob-stats?secret=XXX
// Diagnóstico del canal FOB en el blob de ventas: cuántas filas tienen
// canal="FOB", qué clientes y SKUs aparecen con esas compras.
export async function GET(request: Request) {
  if (!checkSecret(request)) return unauthorized();
  try {
    const ventas = await readVentas();
    const total = ventas.rows.length;
    const conCanal = ventas.rows.filter((r) => r.canal !== undefined).length;
    const fobRows = ventas.rows.filter((r) => r.canal === "FOB");
    const clientesFob = new Map<string, { fcRows: number; boRows: number; skus: Set<string> }>();
    for (const r of fobRows) {
      let entry = clientesFob.get(r.cliente);
      if (!entry) {
        entry = { fcRows: 0, boRows: 0, skus: new Set() };
        clientesFob.set(r.cliente, entry);
      }
      if (r.tipo === "FC") entry.fcRows += 1;
      else entry.boRows += 1;
      entry.skus.add(r.sku);
    }
    const clientes = [...clientesFob.entries()]
      .map(([cliente, v]) => ({ cliente, fcRows: v.fcRows, boRows: v.boRows, skus: [...v.skus].sort() }))
      .sort((a, b) => (b.fcRows + b.boRows) - (a.fcRows + a.boRows));

    return withCors(NextResponse.json({
      ok: true,
      generatedAt: ventas.generatedAt,
      totales: {
        rows: total,
        rowsConCanal: conCanal,
        rowsFob: fobRows.length,
      },
      diagnostico: {
        officeScriptActualizado: conCanal > 0,
        hayVentasFob: fobRows.length > 0,
      },
      clientesFob: clientes,
    }));
  } catch (err) {
    return withCors(NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "read failed" },
      { status: 500 },
    ));
  }
}
