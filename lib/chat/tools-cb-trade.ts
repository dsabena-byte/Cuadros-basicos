import "server-only";
import { getDataset } from "@/lib/data-source";
import type { DataRow } from "@/lib/parse";
import { CB_OBJETIVO } from "@/lib/analisis-trade";
import type { ChatTool } from "./types";
import {
  aTabla,
  candidatosCercanos,
  faltanParaObjetivo,
  inSet,
  limitOf,
  matchesNum,
  numList,
  resolveValues,
  round1,
  strList,
} from "./filters";

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
  /** Qué se interpretó de lo que pidió el modelo, y qué no pudo resolverse. */
  filtros: Record<string, string[]>;
  noResueltos: Record<string, { pedido: string; candidatos: string[] }[]>;
  /** Supuestos que hubo que hacer y la respuesta TIENE que explicitar. */
  interpretaciones: { pedido: string; usado: string; motivo: string }[];
};

/**
 * Resuelve lo que pidió el modelo contra los valores que EXISTEN en la data:
 * el usuario escribe "Frávega" o "Pombo" y en el CSV puede figurar como
 * "Frávega Once Ciudad" o "POMBO MARCELO".
 */
function readFilters(args: Record<string, unknown>, rows: DataRow[]): CbFilters {
  const filtros: Record<string, string[]> = {};
  const noResueltos: CbFilters["noResueltos"] = {};
  const interpretaciones: CbFilters["interpretaciones"] = [];
  const resolver = (campo: string, pedido: unknown, universo: Set<string>) => {
    const uni = [...universo];
    const r = resolveValues(strList(pedido), uni);
    if (r.matched.length > 0) filtros[campo] = r.matched;
    if (r.interpretaciones.length > 0) interpretaciones.push(...r.interpretaciones);
    if (r.unmatched.length > 0) {
      noResueltos[campo] = r.unmatched.map((q) => ({
        pedido: q,
        candidatos: candidatosCercanos(q, uni),
        total_disponibles: uni.length,
      }));
    }
    return r.set;
  };
  const semanas = numList(args.semanas);
  if (semanas) filtros.semanas = [...semanas].map(String);
  return {
    semanas,
    meses: resolver("meses", args.meses, new Set(rows.map((r) => r.mes))),
    divisiones: resolver("divisiones", args.divisiones, new Set(rows.map((r) => r.division))),
    clientes: resolver("clientes", args.clientes, new Set(rows.map((r) => r.cliente))),
    tiendas: resolver("tiendas", args.tiendas, new Set(rows.map((r) => r.tienda))),
    promotores: resolver("promotores", args.promotores, new Set(rows.map((r) => r.promotor))),
    supervisores: resolver("supervisores", args.supervisores, new Set(rows.map((r) => r.supervisor))),
    filtros,
    noResueltos,
    interpretaciones,
  };
}

function applyFilters(rows: DataRow[], f: CbFilters): DataRow[] {
  return rows.filter(
    (r) =>
      matchesNum(f.semanas, r.semana) &&
      inSet(f.meses, r.mes) &&
      inSet(f.divisiones, r.division) &&
      inSet(f.clientes, r.cliente) &&
      inSet(f.tiendas, r.tienda) &&
      inSet(f.promotores, r.promotor) &&
      inSet(f.supervisores, r.supervisor),
  );
}

/** Encabezado común: qué se interpretó y qué no se pudo resolver. */
function meta(f: CbFilters) {
  const out: Record<string, unknown> = {};
  if (Object.keys(f.filtros).length > 0) out.filtros_aplicados = f.filtros;
  if (f.interpretaciones.length > 0) {
    out.interpretaciones = f.interpretaciones;
    out.aclarar = "Decile al usuario qué asumiste, con estas mismas palabras, antes de dar el número.";
  }
  if (Object.keys(f.noResueltos).length > 0) {
    out.sin_coincidencias = f.noResueltos;
    out.como_seguir =
      "Esos valores no existen en la data. Reintentá con alguno de los candidatos, o preguntale al usuario cuál quiso decir. NO respondas que no hay datos sin ofrecer los candidatos.";
  }
  return out;
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
    delta_vs_objetivo: round1(a.tCB > 0 ? (a.rCB / a.tCB) * 100 - CB_OBJETIVO : null),
    // Unidades de CB que faltan cumplir para llegar al objetivo.
    faltan_para_objetivo: faltanParaObjetivo(a.tCB, a.rCB, CB_OBJETIVO),
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

async function scope(args: Record<string, unknown>): Promise<{ data: DataRow[]; f: CbFilters }> {
  const ds = await getDataset();
  const f = readFilters(args, ds.rows);
  return { data: applyFilters(ds.rows, f), f };
}

const FILTER_PROPS = {
  semanas: { type: "array", items: { type: "number" }, description: "números de semana (opcional)" },
  meses: { type: "array", items: { type: "string" }, description: "meses por nombre, ej. 'Abril' (opcional)" },
  divisiones: { type: "array", items: { type: "string" }, description: "LAVADO / REFRIGERACION / COCCION (opcional)" },
  clientes: { type: "array", items: { type: "string" }, description: "cadena; alcanza con parte del nombre, ej. 'Frávega' (opcional)" },
  tiendas: { type: "array", items: { type: "string" }, description: "tienda; alcanza con parte del nombre, ej. 'Once' (opcional)" },
  promotores: { type: "array", items: { type: "string" }, description: "promotor; alcanza con el apellido (opcional)" },
  supervisores: { type: "array", items: { type: "string" }, description: "supervisor; alcanza con el apellido (opcional)" },
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
      const { data, f } = await scope(args);
      if (data.length === 0) return { ...meta(f), sin_datos: true, filas: 0 };
      const evolucion = [...groupBy(data, "semana").entries()]
        .map(([semana, g]) => ({ semana: Number(semana), ...pcts(g.acc) }))
        .sort((a, b) => a.semana - b.semana);
      const porDivision = [...groupBy(data, "division").entries()]
        .map(([division, g]) => ({ division, tiendas: g.tiendas.size, ...pcts(g.acc) }))
        .sort((a, b) => (b.pctCB ?? 0) - (a.pctCB ?? 0));
      return { ...meta(f), totales: kpis(data), evolucion_semanal: evolucion, por_division: porDivision };
    },
  },
  {
    name: "get_cb_por",
    description:
      "TABLA COMPLETA de cumplimiento de CB Trade agrupada por la dimensión que pidas (cliente, tienda, promotor, supervisor, division o sku). " +
      "Devuelve TODOS los grupos, sin recortar ni preseleccionar, cada uno con: % CB, % Infaltables, % Estratégico, unidades target y reales, cantidad de tiendas, desvío vs el objetivo de 80% y cuántas unidades faltan para alcanzarlo. " +
      "Combiná, filtrá, ordená y contá vos sobre esa tabla según lo que pregunten, incluso cruzando varias columnas a la vez. " +
      "Como recibís el universo completo, NUNCA concluyas que algo no existe: si no aparece una fila que cumpla, es que realmente no la hay.",
    parameters: {
      type: "object",
      required: ["dimension"],
      properties: {
        dimension: {
          type: "string",
          enum: ["cliente", "tienda", "promotor", "supervisor", "division", "sku"],
        },
        ...FILTER_PROPS,
      },
    },
    run: async (args) => {
      const key = DIMENSIONS[String(args.dimension ?? "")];
      if (!key) return { error: "dimension inválida", validas: Object.keys(DIMENSIONS) };
      const { data, f } = await scope(args);
      if (data.length === 0) return { ...meta(f), sin_datos: true };
      const filas = [...groupBy(data, key).entries()]
        .filter(([name, g]) => g.acc.tCB > 0 && name && name !== "Sin asignar")
        .map(([nombre, g]) => ({ nombre, tiendas: g.tiendas.size, ...pcts(g.acc) }))
        .sort((a, b) => (b.pctCB ?? 0) - (a.pctCB ?? 0));
      return {
        ...meta(f),
        dimension: args.dimension,
        objetivo: CB_OBJETIVO,
        total_grupos: filas.length,
        formato: "Tabla: `columnas` nombra los campos y cada fila es un array en ese mismo orden.",
        nota:
          "Tabla COMPLETA, ordenada por % CB sólo por comodidad de lectura. Reordenala, filtrala o cruzá columnas como necesites. " +
          "Un 100% sobre pocas unidades target es real pero frágil: mirá targetCB y tiendas antes de llamarlo el mejor.",
        ...aTabla(filas, [
          "nombre", "pctCB", "pctInf", "pctEst", "targetCB", "realCB", "targetInf", "realInf",
          "tiendas", "delta_vs_objetivo", "faltan_para_objetivo",
        ]),
      };
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
      const { data, f } = await scope(args);
      if (data.length === 0) return { ...meta(f), sin_datos: true };
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
        ...meta(f),
        dimension: args.dimension ?? "tienda",
        gap_total: list.reduce((s, x) => s + x.gap_cb, 0),
        top: list.slice(0, limit),
      };
    },
  },
];
