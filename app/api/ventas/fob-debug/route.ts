import { NextResponse } from "next/server";
import { loadCuadroBasico } from "@/lib/data";
import { allSkusOfCB } from "@/lib/cb-match";
import { normalizeCliente } from "@/lib/normalize-cliente";
import { withCors, corsPreflight } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = () => corsPreflight();

function unauthorized() {
  return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
}

function checkSecret(request: Request): boolean {
  const expected = process.env.REFRESH_SECRET1;
  if (!expected) return false;
  const provided =
    request.headers.get("x-refresh-secret") ??
    new URL(request.url).searchParams.get("secret") ??
    "";
  return provided === expected;
}

type RawRow = { cliente: string; sku: string };
type Payload = { fcFob: RawRow[]; boFob: RawRow[] };

// POST /api/ventas/fob-debug — recibe las filas FOB crudas (sin filtrar
// por CB) y las clasifica para entender por qué se descartan tantas.
export async function POST(request: Request) {
  if (!checkSecret(request)) return unauthorized();
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return withCors(NextResponse.json({ error: "JSON inválido" }, { status: 400 }));
  }
  const cb = await loadCuadroBasico();
  const cbPairs = new Set<string>();
  const cbClientes = new Set<string>();
  const cbSkus = new Set<string>();
  for (const c of cb) {
    const norm = normalizeCliente(c.cliente);
    cbClientes.add(norm);
    for (const sku of allSkusOfCB(c)) {
      cbPairs.add(`${norm}|${sku}`);
      cbSkus.add(sku);
    }
  }

  const analyze = (rows: RawRow[]) => {
    const total = rows.length;
    const porCliente = new Map<string, { total: number; matcheados: number; skusNoEnCB: Set<string> }>();
    let matcheados = 0;
    for (const r of rows) {
      const norm = normalizeCliente(r.cliente);
      const sku = String(r.sku ?? "");
      const pair = `${norm}|${sku}`;
      const match = cbPairs.has(pair);
      if (match) matcheados += 1;
      let entry = porCliente.get(norm);
      if (!entry) {
        entry = { total: 0, matcheados: 0, skusNoEnCB: new Set() };
        porCliente.set(norm, entry);
      }
      entry.total += 1;
      if (match) entry.matcheados += 1;
      else entry.skusNoEnCB.add(sku);
    }
    const clientes = [...porCliente.entries()]
      .map(([cliente, v]) => ({
        cliente,
        total: v.total,
        matcheados: v.matcheados,
        descartados: v.total - v.matcheados,
        enCB: cbClientes.has(cliente),
        skusNoEnCB: [...v.skusNoEnCB].sort().slice(0, 10),
      }))
      .sort((a, b) => b.total - a.total);
    return { total, matcheados, descartados: total - matcheados, clientes };
  };

  return withCors(NextResponse.json({
    ok: true,
    cbSummary: {
      items: cb.length,
      clientesUnicos: cbClientes.size,
      skusUnicos: cbSkus.size,
      paresValidos: cbPairs.size,
    },
    fcFob: analyze(body.fcFob ?? []),
    boFob: analyze(body.boFob ?? []),
  }));
}
