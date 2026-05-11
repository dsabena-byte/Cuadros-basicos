import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getExcelTableRows } from "@/lib/graph";
import { ingestVentas } from "@/lib/ingest-ventas";
import type { VentasPayloadRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min (Vercel Pro). Leer 35k+ filas tarda.

// Endpoint disparado por Vercel Cron (config en vercel.json). Lee las
// tablas FC y BO del Excel productivo vía Microsoft Graph API (sin el cap
// de 5K filas del connector de Power Automate) y delega el procesamiento
// al mismo `ingestVentas` que usa POST /api/ventas.
//
// Auth: Vercel Cron manda automáticamente el header
// `Authorization: Bearer ${CRON_SECRET}`. Validamos que matchee.

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAuth(request: Request): boolean {
  const cron = process.env.CRON_SECRET;
  if (!cron) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${cron}`) return true;
  // También aceptamos el refresh secret para poder dispararlo manualmente
  // desde curl o el panel de Vercel sin tener el CRON_SECRET.
  const refresh = process.env.REFRESH_SECRET1;
  if (refresh && new URL(request.url).searchParams.get("secret") === refresh) {
    return true;
  }
  return false;
}

function mapFC(row: Record<string, unknown>): VentasPayloadRow {
  return {
    documentoVentas: (row["No. de Orden ID"] ?? row["No_x002e_ de Orden ID"] ?? "") as string | number,
    cliente: String(row["Cliente"] ?? ""),
    sku: String(row["Material ID"] ?? ""),
    unidades: (row["CANTIDAD PEDIDO FC"] ?? row["VolumenVentas"] ?? 0) as number,
    fecha: (row["Fecha de Creación de Factura"] ?? row["Fecha Creación Doc. Venta"] ?? 0) as string | number,
    vendedor: String(row["Ejecutivo de Venta"] ?? ""),
  };
}

function mapBO(row: Record<string, unknown>): VentasPayloadRow {
  return {
    documentoVentas: (row["Documento Venta"] ?? "") as string | number,
    cliente: String(row["Cliente Descripción"] ?? row["Cliente Descripcion"] ?? ""),
    sku: String(row["Material"] ?? ""),
    unidades: (row["Cantidad Pendiente"] ?? 0) as number,
    fecha: (row["Fecha Creación Cabecera"] ?? 0) as string | number,
    vendedor: String(row["Cliente Venta Ejecutivo Venta Descripción"] ?? row["Ejecutivo Venta Descripción"] ?? ""),
  };
}

async function handle(request: Request) {
  if (!checkAuth(request)) return unauthorized();

  const tableFC = process.env.GRAPH_TABLE_FC;
  const tableBO = process.env.GRAPH_TABLE_BO;
  if (!tableFC || !tableBO) {
    return NextResponse.json(
      { error: "Faltan env vars GRAPH_TABLE_FC y/o GRAPH_TABLE_BO" },
      { status: 500 },
    );
  }

  let fcRaw: Array<Record<string, unknown>> = [];
  let boRaw: Array<Record<string, unknown>> = [];
  const t0 = Date.now();
  try {
    [fcRaw, boRaw] = await Promise.all([
      getExcelTableRows(tableFC),
      getExcelTableRows(tableBO),
    ]);
  } catch (err) {
    return NextResponse.json(
      { error: "Graph fetch failed", details: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
  const tFetch = Date.now() - t0;

  const payload = {
    generatedAt: new Date().toISOString(),
    fc: fcRaw.map(mapFC),
    bo: boRaw.map(mapBO),
  };

  const { result, error } = await ingestVentas(payload);
  if (error) {
    return NextResponse.json(
      { ...error.body, fetchMs: tFetch, rawCounts: { fc: fcRaw.length, bo: boRaw.length } },
      { status: error.status },
    );
  }

  revalidatePath("/");
  revalidatePath("/ventas");
  return NextResponse.json({ ...result, fetchMs: tFetch });
}

export const GET = handle;
export const POST = handle;
