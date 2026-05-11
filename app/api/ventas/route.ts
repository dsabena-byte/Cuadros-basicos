import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { writeVentas, readVentas } from "@/lib/storage";
import { loadCuadroBasico } from "@/lib/data";
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
// Auth: header `x-refresh-secret` que matchee REFRESH_SECRET1.

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

function normalizeFecha(raw: string | number): string {
  const s = String(raw).trim();
  // YYYY-MM-DD o ISO completo
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // DD/MM/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // YYYYMMDD (típico de la solapa FC del Excel — se almacena como int)
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  throw new Error(`Fecha inválida: "${raw}"`);
}

// Mismo cliente puede aparecer escrito como "FRAVEGA S A C I E I" o
// "FRAVEGA  S A C I E I" según la fila del Excel. Normalizamos antes de
// matchear contra cuadro-basico.json: trim, uppercase, espacios colapsados.
function normalizeCliente(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, " ");
}

function toRow(p: VentasPayloadRow, tipo: "FC" | "BO"): VentaRow {
  // documentoVentas es opcional: si Power Automate no lo mapea (puede pasar
  // por nombres internos raros del Excel), persistimos string vacío. El
  // dashboard no lo usa para filtrar, sólo para contar pedidos únicos.
  if (!p.cliente) throw new Error("cliente requerido");
  if (!p.sku) throw new Error("sku requerido");
  const unidades = Number(p.unidades);
  if (!Number.isFinite(unidades)) {
    throw new Error(`unidades inválidas para ${p.sku}: ${p.unidades}`);
  }
  // Las unidades negativas son devoluciones reales del negocio; las sumamos
  // tal cual y dejamos que el dashboard refleje el neto.
  const fecha = normalizeFecha(p.fecha);
  const mes = Number(fecha.slice(5, 7));
  return {
    documentoVentas: p.documentoVentas != null ? String(p.documentoVentas) : "",
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

  // Mapa "cliente_normalizado|sku" → cliente canónico del CB. Filtramos
  // descartando las filas del Excel cuyo (cliente, sku) no matchea — el
  // dashboard sólo usa esos pares y persistir el resto infla el blob. El
  // cliente se normaliza para tolerar variantes en el Excel, y al persistir
  // se usa el nombre canónico del catálogo así el dashboard hace match
  // exacto sin tener que normalizar también del lado del cliente.
  const cb = await loadCuadroBasico();
  const cbCanonical = new Map<string, string>();
  for (const c of cb) cbCanonical.set(`${normalizeCliente(c.cliente)}|${c.sku}`, c.cliente);
  const canonicalFor = (p: VentasPayloadRow): string | undefined =>
    cbCanonical.get(`${normalizeCliente(p.cliente)}|${p.sku}`);

  const fcCB = payload.fc.filter((p) => canonicalFor(p) !== undefined);
  const boCB = payload.bo.filter((p) => canonicalFor(p) !== undefined);
  const skipped = (payload.fc.length - fcCB.length) + (payload.bo.length - boCB.length);

  // Filas con datos sucios (fechas inválidas, sin documentoVentas, etc.) se
  // descartan y se loguean — Excel productivo siempre tiene ruido, no
  // queremos abortar todo el batch por un puñado de filas malas. Sólo
  // devolvemos 422 si NO se pudo procesar nada.
  const errors: string[] = [];
  const rows: VentaRow[] = [];
  fcCB.forEach((p, i) => {
    try { rows.push(toRow({ ...p, cliente: canonicalFor(p)! }, "FC")); } catch (e) {
      errors.push(`fc[${i}]: ${e instanceof Error ? e.message : "error"}`);
    }
  });
  boCB.forEach((p, i) => {
    try { rows.push(toRow({ ...p, cliente: canonicalFor(p)! }, "BO")); } catch (e) {
      errors.push(`bo[${i}]: ${e instanceof Error ? e.message : "error"}`);
    }
  });
  if (rows.length === 0 && (fcCB.length + boCB.length) > 0) {
    return NextResponse.json({
      error: "Todas las filas (post-filtro CB) fallaron validación",
      details: errors.slice(0, 20),
      totalErrors: errors.length,
      received: { fc: payload.fc.length, bo: payload.bo.length },
      matchedCB: { fc: fcCB.length, bo: boCB.length },
    }, { status: 422 });
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
    fc: rows.filter((r) => r.tipo === "FC").length,
    bo: rows.filter((r) => r.tipo === "BO").length,
    pedidos: new Set(rows.map((r) => r.documentoVentas)).size,
    received: { fc: payload.fc.length, bo: payload.bo.length },
    matchedCB: { fc: fcCB.length, bo: boCB.length },
    skippedNoCB: skipped,
    skippedInvalid: errors.length,
    invalidSample: errors.slice(0, 10),
    blobUrl: url,
  });
}
