import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { writeVentas, readVentas } from "@/lib/storage";
import type {
  VentasPayload,
  VentasPayloadRow,
  VentaRow,
  VentasFile,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET → metadata (para debug y para que Power Automate verifique conectividad).
// POST → recibe el payload del flow con las dos solapas (FC + BO),
//        las flatten en VentaRow[] y persiste el archivo.
//
// Auth: header `x-refresh-secret` que matchee REFRESH_SECRET.

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkSecret(request: Request): boolean {
  const expected = process.env.REFRESH_SECRET;
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

function normalizeFecha(raw: string): string {
  // Acepta YYYY-MM-DD, ISO completo, o DD/MM/YYYY.
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  throw new Error(`Fecha inválida: "${raw}"`);
}

function toRow(p: VentasPayloadRow, tipo: "FC" | "BO"): VentaRow {
  if (!p.documentoVentas) throw new Error("documentoVentas requerido");
  if (!p.cliente) throw new Error("cliente requerido");
  if (!p.sku) throw new Error("sku requerido");
  const unidades = Number(p.unidades);
  if (!Number.isFinite(unidades) || unidades < 0) {
    throw new Error(`unidades inválidas para ${p.documentoVentas}/${p.sku}: ${p.unidades}`);
  }
  const fecha = normalizeFecha(p.fecha);
  const mes = Number(fecha.slice(5, 7));
  return {
    documentoVentas: String(p.documentoVentas),
    cliente: p.cliente,
    sku: p.sku,
    tipo,
    unidades,
    fecha,
    mes,
    vendedor: p.vendedor ?? "",
  };
}

export async function POST(request: Request) {
  if (!checkSecret(request)) return unauthorized();
  let payload: VentasPayload;
  try {
    payload = (await request.json()) as VentasPayload;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!payload || !Array.isArray(payload.fc) || !Array.isArray(payload.bo)) {
    return NextResponse.json(
      { error: "El payload tiene que tener arrays `fc` y `bo`" },
      { status: 400 },
    );
  }

  const errors: string[] = [];
  const rows: VentaRow[] = [];
  payload.fc.forEach((p, i) => {
    try { rows.push(toRow(p, "FC")); } catch (e) {
      errors.push(`fc[${i}]: ${e instanceof Error ? e.message : "error"}`);
    }
  });
  payload.bo.forEach((p, i) => {
    try { rows.push(toRow(p, "BO")); } catch (e) {
      errors.push(`bo[${i}]: ${e instanceof Error ? e.message : "error"}`);
    }
  });
  if (errors.length > 0) {
    return NextResponse.json({ error: "Validación falló", details: errors.slice(0, 20), totalErrors: errors.length }, { status: 422 });
  }

  const file: VentasFile = {
    generatedAt: payload.generatedAt ?? new Date().toISOString(),
    source: "sharepoint",
    rows,
  };

  const { url } = await writeVentas(file);
  revalidatePath("/");

  return NextResponse.json({
    ok: true,
    generatedAt: file.generatedAt,
    rows: rows.length,
    fc: payload.fc.length,
    bo: payload.bo.length,
    pedidos: new Set(rows.map((r) => r.documentoVentas)).size,
    blobUrl: url,
  });
}
