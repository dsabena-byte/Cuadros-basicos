import "server-only";
import { getDataset } from "@/lib/data-source";
import type { DataRow } from "@/lib/parse";
import { CB_OBJETIVO } from "@/lib/analisis-trade";
import type { ChatTool } from "./types";
import { limitOf, matches, matchesNum, numList, round1, strList } from "./filters";

// ============================================================================
// Tools del dashboard "Cuadro Básico Trade" (tab Cumplimiento CB de /).
//
// Las fórmulas replican calcKPIs / rankBy / evolucionPorSemana de
// public/dashboard.js — % CB = ΣrealCB / ΣtargetCB, Estratégico = CB − Infaltable.
// ============================================================================

type CbFilters = {
  semanas?: Set<number>;
  meses?: Set<string>;
  divisiones?: Set<string>;
  clientes?: Set<string>;
  tiendas?: Set<string>;
  promotores?: Set<string>;
  supervisores?: Set<string>;
};

function readFilters(args: Record<string, unknown>): CbFilters {
  return {
    semanas: numList(args.semanas),
    meses: strList(args.meses),
    divisiones: strList(args.divisiones),
    clientes: strList(args.clientes),
    tiendas: strList(args.tiendas),
    promotores: strList(args.promotores),
    supervisores: strList(args.supervisores),
  };
}

function applyFilters(rows: DataRow[], f: CbFilters): DataRow[] {
  return rows.filter(
    (r) =>
      matchesNum(f.semanas, r.semana) &&
      matches(f.meses, r.mes) &&
      matches(f.divisiones, r.division) &&
      matches(f.clientes, r.cliente) &&
      matches(f.tiendas, r.tienda) &&
      matches(f.promotores, r.promotor) &&
      matches(f.supervisores, r.supervisor),
  );
}

type Acc = { tCB: number; rCB: number; tInf: number; rInf: number };

function accumulate(rows: DataRow[]): Acc {
  const a: Acc = { tCB: 0, rCB: 0, tInf: 0, rInf: 0 };
  for (const r of rows) {
    a.tCB += r.targetCB;
    a.rCB += r.realCB;
    a.tInf += r.targetInf;
    a.rInf += r.realInf;
  }
  return a;
}

function pcts(a: Acc) {
  const tEst = a.tCB - a.tInf;
  const rEst = a.rCB - a.rInf;
  return {
    pctCB: round1(a.tCB > 0 ? (a.rCB / a.tCB) * 100 : null),
    pctInf: round1(a.tInf > 0 ? (a.rInf / a.tInf) * 100 : null),
    pctEst: round1(tEst > 0 ? (rEst / tEst) * 100 : null),
    targetCB: a.tCB,
    realCB: a.rCB,
    targetInf: a.tInf,
    realInf: a.rInf,
    targetEst: tEst,
    realEst: rEst,
  };
}

function kpis(rows: DataRow[]) {
  return {
    ...pcts(accumulate(rows)),
    objetivo: CB_OBJETIVO,
    tiendas: new Set(rows.map((r) => r.tienda)).size,
    skus: new Set(rows.map((r) => r.sku)).size,
    semanas: [...new Set(rows.map((r) => r.semana))].sort((a, b) => a - b),
  };
}

const DIMENSIONS: Record<string, keyof DataRow> = {
  cliente: "cliente",
  tienda: "tienda",
  promotor: "promotor",
  supervisor: "supervisor",
  division: "division",
  categoria: "division",
  sku: "sku",
  semana: "semana",
};

function groupBy(rows: DataRow[], key: keyof DataRow) {
  const map = new Map<string, { acc: Acc; tiendas: Set<string> }>();
  for (const r of rows) {
    const k = (r[key] ?? "").toString() || "Sin asignar";
    let g = map.get(k);
    if (!g) {
      g = { acc: { tCB: 0, rCB: 0, tInf: 0, rInf: 0 }, tiendas: new Set() };
      map.set(k, g);
    }
    g.acc.tCB += r.targetCB;
    g.acc.rCB += r.realCB;
    g.acc.tInf += r.targetInf;
    g.acc.rInf += r.realInf;
    g.tiendas.add(r.tienda);
  }
  return map;
}

async function rows(f: CbFilters): Promise<DataRow[]> {
  const ds = await getDataset();
  return applyFilters(ds.rows, f);
}

const FILTER_PROPS = {
  semanas: { type: "array", items: { type: "number" }, description: "números de semana (opcional)" },
  meses: { type: "array", items: { type: "string" }, description: "meses por nombre, ej. 'Abril' (opcional)" },
  divisiones: { type: "array", items: { type: "string" }, description: "LAVADO / REFRIGERACION / COCCION (opcional)" },
  clientes: { type: "array", items: { type: "string" }, description: "cadenas, ej. 'Frávega' (opcional)" },
  tiendas: { type: "array", items: { type: "string" }, description: "nombre completo de tienda (opcional)" },
  promotores: { type: "array", items: { type: "string" }, description: "promotores (opcional)" },
  supervisores: { type: "array", items: { type: "string" }, description: "supervisores (opcional)" },
} as const;

export const cbTradeTools: ChatTool[] = [
  {
    name: "get_cb_contexto",
    description:
      "Valores disponibles para filtrar (semanas, meses, divisiones, clientes, promotores, supervisores) y última actualización. Llamalo PRIMERO si no estás seguro de cómo se escribe un cliente, promotor o división.",
    parameters: { type: "object", properties: {} },
    run: async () => {
      const ds = await getDataset();
      const r = ds.rows;
      const uniq = (fn: (x: DataRow) => string) =>
        [...new Set(r.map(fn).filter(Boolean))].sort();
      return {
        objetivo_cb: CB_OBJETIVO,
        generado: ds.generatedAt,
        semanas: [...new Set(r.map((x) => x.semana))].sort((a, b) => a - b),
        meses: uniq((x) => x.mes),
        divisiones: uniq((x) => x.division),
        clientes: uniq((x) => x.cliente),
        promotores: uniq((x) => x.promotor),
        supervisores: uniq((x) => x.supervisor),
        tiendas_totales: new Set(r.map((x) => x.tienda)).size,
        filas: r.length,
      };
    },
  },
  {
    name: "get_cb_resumen",
    description:
      "Cumplimiento de Cuadro Básico Trade: % CB, % Infaltables, % Estratégico (objetivo 80%), unidades target/real, cantidad de tiendas y SKUs, más la evolución semanal y el corte por división. Acepta filtros opcionales.",
    parameters: { type: "object", properties: { ...FILTER_PROPS } },
    run: async (args) => {
      const data = await rows(readFilters(args));
      if (data.length === 0) return { sin_datos: true, filas: 0 };
      const evolucion = [...groupBy(data, "semana").entries()]
        .map(([semana, g]) => ({ semana: Number(semana), ...pcts(g.acc) }))
        .sort((a, b) => a.semana - b.semana);
      const porDivision = [...groupBy(data, "division").entries()]
        .map(([division, g]) => ({ division, tiendas: g.tiendas.size, ...pcts(g.acc) }))
        .sort((a, b) => (b.pctCB ?? 0) - (a.pctCB ?? 0));
      return { totales: kpis(data), evolucion_semanal: evolucion, por_division: porDivision };
    },
  },
  {
    name: "get_cb_ranking",
    description:
      "Ranking de cumplimiento CB por dimensión (cliente, tienda, promotor, supervisor, division o sku), con % CB / Infaltables / Estratégico y el desvío vs el objetivo de 80%. Ordena de mejor a peor salvo que pidas 'peores'.",
    parameters: {
      type: "object",
      required: ["dimension"],
      properties: {
        dimension: {
          type: "string",
          enum: ["cliente", "tienda", "promotor", "supervisor", "division", "sku"],
        },
        orden: { type: "string", enum: ["mejores", "peores"], description: "default: mejores" },
        limit: { type: "number", description: "default 15, máx 60" },
        ...FILTER_PROPS,
      },
    },
    run: async (args) => {
      const key = DIMENSIONS[String(args.dimension ?? "")];
      if (!key) return { error: "dimension inválida" };
      const data = await rows(readFilters(args));
      if (data.length === 0) return { sin_datos: true };
      const limit = limitOf(args.limit, 15, 60);
      const list = [...groupBy(data, key).entries()]
        .filter(([name, g]) => g.acc.tCB > 0 && name && name !== "Sin asignar")
        .map(([name, g]) => {
          const p = pcts(g.acc);
          return {
            nombre: name,
            tiendas: g.tiendas.size,
            ...p,
            delta_vs_objetivo: round1((p.pctCB ?? 0) - CB_OBJETIVO),
          };
        });
      list.sort((a, b) =>
        args.orden === "peores"
          ? (a.pctCB ?? 0) - (b.pctCB ?? 0)
          : (b.pctCB ?? 0) - (a.pctCB ?? 0),
      );
      return { dimension: args.dimension, total_grupos: list.length, ranking: list.slice(0, limit) };
    },
  },
  {
    name: "get_cb_gaps",
    description:
      "Dónde está la pérdida: mayores brechas absolutas de CB (targetCB − realCB) por tienda o por SKU. Útil para '¿qué me falta?' o '¿dónde ataco primero?'.",
    parameters: {
      type: "object",
      properties: {
        dimension: { type: "string", enum: ["tienda", "sku", "cliente"], description: "default: tienda" },
        limit: { type: "number", description: "default 15, máx 60" },
        ...FILTER_PROPS,
      },
    },
    run: async (args) => {
      const key = DIMENSIONS[String(args.dimension ?? "tienda")] ?? "tienda";
      const data = await rows(readFilters(args));
      if (data.length === 0) return { sin_datos: true };
      const limit = limitOf(args.limit, 15, 60);
      const list = [...groupBy(data, key).entries()]
        .map(([name, g]) => ({
          nombre: name,
          gap_cb: g.acc.tCB - g.acc.rCB,
          gap_infaltables: g.acc.tInf - g.acc.rInf,
          ...pcts(g.acc),
        }))
        .filter((x) => x.gap_cb > 0)
        .sort((a, b) => b.gap_cb - a.gap_cb);
      return {
        dimension: args.dimension ?? "tienda",
        gap_total: list.reduce((s, x) => s + x.gap_cb, 0),
        top: list.slice(0, limit),
      };
    },
  },
];
