import { writeVentas } from "./storage";
import { loadCuadroBasico } from "./data";
import type {
  VentasPayload,
  VentasPayloadRow,
  VentaRow,
  VentasFile,
} from "./types";

function normalizeFecha(raw: string | number): string {
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  throw new Error(`Fecha inválida: "${raw}"`);
}

function normalizeCliente(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, " ");
}

function toRow(p: VentasPayloadRow, tipo: "FC" | "BO"): VentaRow {
  if (!p.cliente) throw new Error("cliente requerido");
  if (!p.sku) throw new Error("sku requerido");
  const unidades = Number(p.unidades);
  if (!Number.isFinite(unidades)) {
    throw new Error(`unidades inválidas para ${p.sku}: ${p.unidades}`);
  }
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

export type IngestResult = {
  ok: boolean;
  generatedAt: string;
  rows: number;
  fc: number;
  bo: number;
  pedidos: number;
  received: { fc: number; bo: number };
  matchedCB: { fc: number; bo: number };
  skippedNoCB: number;
  skippedInvalid: number;
  invalidSample: string[];
  blobUrl?: string;
};

export type IngestError = {
  status: 400 | 422;
  body: Record<string, unknown>;
};

// Procesa un payload de ventas (FC + BO crudo) contra el catálogo del CB
// y persiste las filas válidas. Devuelve métricas del proceso o un error
// estructurado. Compartido por POST /api/ventas (Power Automate manda el
// payload) y GET /api/cron/sync-ventas (cron + Graph API).
export async function ingestVentas(
  payload: VentasPayload,
): Promise<{ result: IngestResult; error?: never } | { result?: never; error: IngestError }> {
  if (!payload || !Array.isArray(payload.fc) || !Array.isArray(payload.bo)) {
    return {
      error: {
        status: 400,
        body: { error: "El payload tiene que tener arrays `fc` y `bo`" },
      },
    };
  }

  const cb = await loadCuadroBasico();
  const cbCanonical = new Map<string, string>();
  for (const c of cb) cbCanonical.set(`${normalizeCliente(c.cliente)}|${c.sku}`, c.cliente);
  const canonicalFor = (p: VentasPayloadRow): string | undefined =>
    cbCanonical.get(`${normalizeCliente(p.cliente)}|${p.sku}`);

  const fcCB = payload.fc.filter((p) => canonicalFor(p) !== undefined);
  const boCB = payload.bo.filter((p) => canonicalFor(p) !== undefined);
  const skippedNoCB = (payload.fc.length - fcCB.length) + (payload.bo.length - boCB.length);

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
    return {
      error: {
        status: 422,
        body: {
          error: "Todas las filas (post-filtro CB) fallaron validación",
          details: errors.slice(0, 20),
          totalErrors: errors.length,
          received: { fc: payload.fc.length, bo: payload.bo.length },
          matchedCB: { fc: fcCB.length, bo: boCB.length },
        },
      },
    };
  }

  const file: VentasFile = {
    generatedAt: payload.generatedAt ?? new Date().toISOString(),
    source: "sharepoint",
    rows,
  };

  const { url } = await writeVentas(file);

  return {
    result: {
      ok: true,
      generatedAt: file.generatedAt,
      rows: rows.length,
      fc: rows.filter((r) => r.tipo === "FC").length,
      bo: rows.filter((r) => r.tipo === "BO").length,
      pedidos: new Set(rows.map((r) => r.documentoVentas)).size,
      received: { fc: payload.fc.length, bo: payload.bo.length },
      matchedCB: { fc: fcCB.length, bo: boCB.length },
      skippedNoCB,
      skippedInvalid: errors.length,
      invalidSample: errors.slice(0, 10),
      blobUrl: url ?? undefined,
    },
  };
}
