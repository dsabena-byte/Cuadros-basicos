import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { readVentas } from "@/lib/storage";
import { ingestVentas } from "@/lib/ingest-ventas";
import type { VentasPayload } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET → metadata (para debug y para que Power Automate verifique conectividad).
// POST → recibe el payload del flow con las dos solapas (FC + BO),
//        las flatten en VentaRow[] y persiste el archivo.
//
// Auth: header `x-refresh-secret` que matchee REFRESH_SECRET1.
//
// NOTA: el procesamiento real lo hace `ingestVentas` en lib/ingest-ventas.ts
// para que el cron de Graph API (app/api/cron/sync-ventas) lo reutilice.

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

export async function GET(request: Request) {
  if (!checkSecret(request)) return unauthorized();
  try {
    const v = await readVentas();
    return NextResponse.json({
      ok: true,
      generatedAt: v.generatedAt,
      source: v.source,
      rows: v.rows.length,
      fc: v.rows.filter((r) => r.tipo === "FC").length,
      bo: v.rows.filter((r) => r.tipo === "BO").length,
      pedidos: new Set(v.rows.map((r) => r.documentoVentas)).size,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "read failed" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!checkSecret(request)) return unauthorized();
  let payload: VentasPayload;
  try {
    payload = (await request.json()) as VentasPayload;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const { result, error } = await ingestVentas(payload);
  if (error) {
    return NextResponse.json(error.body, { status: error.status });
  }
  revalidatePath("/");
  return NextResponse.json(result);
}
