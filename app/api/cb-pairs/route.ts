import { NextResponse } from "next/server";
import { loadCuadroBasico } from "@/lib/data";
import { withCors, corsPreflight } from "@/lib/cors";
import { allSkusOfCB } from "@/lib/cb-match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = () => corsPreflight();

// GET → devuelve la lista de pares "CLIENTE_NORMALIZADO|SKU" del Cuadro
// Básico, para que el Office Script en Excel (docs/office-scripts.md)
// filtre las filas de FC/BO ANTES de POSTear a /api/ventas. Sin este
// pre-filtro el payload supera el límite de Vercel (~4.5MB) porque el
// Excel tiene 35K+ filas y la mayoría no son del CB.
//
// El cliente se normaliza igual que en /api/ventas (uppercase, trim,
// espacios colapsados) para tolerar variaciones del Excel.

function unauthorized() {
  return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
}

function checkSecret(request: Request): boolean {
  const expected = process.env.REFRESH_SECRET1;
  if (!expected) return false;
  const url = new URL(request.url);
  const provided =
    request.headers.get("x-refresh-secret") ??
    url.searchParams.get("secret") ??
    "";
  return provided === expected;
}

function normalizeCliente(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, " ");
}

export async function GET(request: Request) {
  if (!checkSecret(request)) return unauthorized();
  try {
    const cb = await loadCuadroBasico();
    // Incluimos primary SKU + homólogos: Power Automate envía ventas con
    // el SKU real que aparece en la factura, que puede ser cualquiera de
    // los homólogos.
    const set = new Set<string>();
    for (const c of cb) {
      const norm = normalizeCliente(c.cliente);
      for (const sku of allSkusOfCB(c)) set.add(`${norm}|${sku}`);
    }
    const pairs = Array.from(set);
    return withCors(NextResponse.json({
      ok: true,
      count: pairs.length,
      pairs,
    }));
  } catch (err) {
    return withCors(NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "read failed" },
      { status: 500 },
    ));
  }
}
