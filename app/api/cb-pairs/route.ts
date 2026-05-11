import { NextResponse } from "next/server";
import { loadCuadroBasico } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET → devuelve la lista de pares "CLIENTE_NORMALIZADO|SKU" del Cuadro
// Básico, para que el Office Script en Excel (docs/office-scripts.md)
// filtre las filas de FC/BO ANTES de POSTear a /api/ventas. Sin este
// pre-filtro el payload supera el límite de Vercel (~4.5MB) porque el
// Excel tiene 35K+ filas y la mayoría no son del CB.
//
// El cliente se normaliza igual que en /api/ventas (uppercase, trim,
// espacios colapsados) para tolerar variaciones del Excel.

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const pairs = Array.from(
      new Set(cb.map((c) => `${normalizeCliente(c.cliente)}|${c.sku}`)),
    );
    return NextResponse.json({
      ok: true,
      count: pairs.length,
      pairs,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "read failed" },
      { status: 500 },
    );
  }
}
