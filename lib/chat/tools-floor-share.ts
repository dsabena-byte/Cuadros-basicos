import "server-only";
import { getDataset } from "@/lib/data-source";
import type { FloorShareEnrichedRow } from "@/lib/dataset-floorshare";
import { FS_DREAN, FS_TARGETS, fsTargetForCat } from "@/lib/analisis-trade";
import { monthLabelFromCode } from "@/lib/parse-floorshare";
import type { ChatTool } from "./types";
import { limitOf, matches, matchesNum, numList, round1, strList } from "./filters";

// ============================================================================
// Tools del dashboard "Floor Share" (tab Floor Share de /).
//
// Share Drean = unidades Drean / unidades totales del piso. Si el archivo trae
// fila "Total" se usa esa como denominador; si no, la suma de marcas (misma
// regla que fsComputeFS en public/dashboard.js).
// ============================================================================

type FsFilters = {
  semanas?: Set<number>;
  meses?: Set<string>;
  categorias?: Set<string>;
  clientes?: Set<string>;
  tiendas?: Set<string>;
  promotores?: Set<string>;
  supervisores?: Set<string>;
};

function readFilters(args: Record<string, unknown>): FsFilters {
  return {
    semanas: numList(args.semanas),
    meses: strList(args.meses),
    categorias: strList(args.categorias),
    clientes: strList(args.clientes),
    tiendas: strList(args.tiendas),
    promotores: strList(args.promotores),
    supervisores: strList(args.supervisores),
  };
}

/** Acepta el mes como código ("2026-04") o como etiqueta ("Abril 2026"). */
function mesMatches(set: Set<string> | undefined, r: FloorShareEnrichedRow): boolean {
  if (!set) return true;
  return matches(set, r.month) || matches(set, monthLabelFromCode(r.month));
}

function applyFilters(rows: FloorShareEnrichedRow[], f: FsFilters): FloorShareEnrichedRow[] {
  return rows.filter(
    (r) =>
      matchesNum(f.semanas, r.semana) &&
      mesMatches(f.meses, r) &&
      matches(f.categorias, r.category) &&
      matches(f.clientes, r.cliente) &&
      matches(f.tiendas, r.storeName) &&
      matches(f.promotores, r.promotor) &&
      matches(f.supervisores, r.supervisor),
  );
}

type ShareAcc = { drean: number; totalRow: number; brandSum: number };

function newAcc(): ShareAcc {
  return { drean: 0, totalRow: 0, brandSum: 0 };
}

function add(acc: ShareAcc, r: FloorShareEnrichedRow): void {
  const u = r.units || 0;
  if ((r.brand || "").toLowerCase() === "total") {
    acc.totalRow += u;
    return;
  }
  acc.brandSum += u;
  if (r.brand === FS_DREAN) acc.drean += u;
}

function shareOf(acc: ShareAcc): { share: number | null; dreanUnits: number; totalUnits: number } {
  const total = acc.totalRow > 0 ? acc.totalRow : acc.brandSum;
  return {
    share: round1(total > 0 ? (acc.drean / total) * 100 : null),
    dreanUnits: acc.drean,
    totalUnits: total,
  };
}

function computeShare(rows: FloorShareEnrichedRow[]) {
  const acc = newAcc();
  for (const r of rows) add(acc, r);
  return shareOf(acc);
}

/** Objetivo del grupo: promedio de los targets por categoría ponderado por unidades. */
function targetPonderado(rows: FloorShareEnrichedRow[]): number | null {
  const porCat = new Map<string, ShareAcc>();
  for (const r of rows) {
    let a = porCat.get(r.category);
    if (!a) {
      a = newAcc();
      porCat.set(r.category, a);
    }
    add(a, r);
  }
  let num = 0;
  let den = 0;
  for (const [cat, acc] of porCat) {
    const t = fsTargetForCat(cat);
    if (t === null) continue;
    const { totalUnits } = shareOf(acc);
    num += t * totalUnits;
    den += totalUnits;
  }
  return den > 0 ? round1(num / den) : null;
}

const DIMENSIONS = {
  cliente: (r: FloorShareEnrichedRow) => r.cliente,
  tienda: (r: FloorShareEnrichedRow) => r.storeName,
  promotor: (r: FloorShareEnrichedRow) => r.promotor,
  supervisor: (r: FloorShareEnrichedRow) => r.supervisor,
  categoria: (r: FloorShareEnrichedRow) => r.category,
} as const;

function groupShare(rows: FloorShareEnrichedRow[], keyFn: (r: FloorShareEnrichedRow) => string) {
  const map = new Map<string, { acc: ShareAcc; rows: FloorShareEnrichedRow[] }>();
  for (const r of rows) {
    const k = keyFn(r) || "Sin asignar";
    let g = map.get(k);
    if (!g) {
      g = { acc: newAcc(), rows: [] };
      map.set(k, g);
    }
    add(g.acc, r);
    g.rows.push(r);
  }
  return map;
}

async function fsRows(f: FsFilters): Promise<FloorShareEnrichedRow[]> {
  const ds = await getDataset();
  return applyFilters(ds.floorShare?.rows ?? [], f);
}

const FILTER_PROPS = {
  semanas: { type: "array", items: { type: "number" }, description: "números de semana (opcional)" },
  meses: { type: "array", items: { type: "string" }, description: "'2026-04' o 'Abril 2026' (opcional)" },
  categorias: { type: "array", items: { type: "string" }, description: "lavado / refrigeracion / coccion (opcional)" },
  clientes: { type: "array", items: { type: "string" }, description: "cadenas (opcional)" },
  tiendas: { type: "array", items: { type: "string" }, description: "nombre de tienda (opcional)" },
  promotores: { type: "array", items: { type: "string" }, description: "promotores (opcional)" },
  supervisores: { type: "array", items: { type: "string" }, description: "supervisores (opcional)" },
} as const;

export const floorShareTools: ChatTool[] = [
  {
    name: "get_fs_contexto",
    description:
      "Valores disponibles para filtrar en Floor Share (semanas, meses, categorías, marcas, clientes, promotores, supervisores) y los objetivos por categoría. Llamalo PRIMERO si no sabés cómo se escribe un valor.",
    parameters: { type: "object", properties: {} },
    run: async () => {
      const ds = await getDataset();
      const fs = ds.floorShare;
      if (!fs) return { sin_datos: true };
      const r = fs.rows;
      return {
        objetivos_por_categoria: FS_TARGETS,
        marca_propia: FS_DREAN,
        generado: fs.generatedAt,
        semanas: [...new Set(r.map((x) => x.semana).filter((s): s is number => s != null))].sort((a, b) => a - b),
        meses: fs.months.map((m) => ({ codigo: m, label: monthLabelFromCode(m) })),
        categorias: fs.categories,
        marcas: fs.brands,
        clientes: [...new Set(r.map((x) => x.cliente))].sort(),
        promotores: [...new Set(r.map((x) => x.promotor))].sort(),
        supervisores: [...new Set(r.map((x) => x.supervisor))].sort(),
        tiendas_totales: new Set(r.map((x) => x.storeName)).size,
      };
    },
  },
  {
    name: "get_fs_resumen",
    description:
      "Floor Share de Drean: share total, share por categoría con su objetivo y desvío (Lavado 32%, Refrigeración 25%, Cocción 23%), y el share de todas las marcas del piso. Acepta filtros opcionales.",
    parameters: { type: "object", properties: { ...FILTER_PROPS } },
    run: async (args) => {
      const data = await fsRows(readFilters(args));
      if (data.length === 0) return { sin_datos: true };

      const porCategoria = [...groupShare(data, DIMENSIONS.categoria).entries()]
        .map(([categoria, g]) => {
          const s = shareOf(g.acc);
          const target = fsTargetForCat(categoria);
          return {
            categoria,
            ...s,
            objetivo: target,
            delta_vs_objetivo: target === null || s.share === null ? null : round1(s.share - target),
          };
        })
        .sort((a, b) => (b.share ?? 0) - (a.share ?? 0));

      // Share por marca sobre el mismo denominador que el share de Drean.
      const totalUnits = computeShare(data).totalUnits;
      const porMarca = new Map<string, number>();
      for (const r of data) {
        if ((r.brand || "").toLowerCase() === "total") continue;
        porMarca.set(r.brand, (porMarca.get(r.brand) ?? 0) + (r.units || 0));
      }
      const marcas = [...porMarca.entries()]
        .map(([marca, unidades]) => ({
          marca,
          unidades,
          share: round1(totalUnits > 0 ? (unidades / totalUnits) * 100 : null),
        }))
        .sort((a, b) => b.unidades - a.unidades);

      const total = computeShare(data);
      return {
        total: {
          ...total,
          objetivo_ponderado: targetPonderado(data),
          tiendas: new Set(data.map((r) => r.storeName)).size,
        },
        por_categoria: porCategoria,
        por_marca: marcas,
      };
    },
  },
  {
    name: "get_fs_ranking",
    description:
      "Ranking de Floor Share de Drean por dimensión (cliente, tienda, promotor, supervisor o categoría), con share, unidades y desvío vs el objetivo ponderado del grupo.",
    parameters: {
      type: "object",
      required: ["dimension"],
      properties: {
        dimension: { type: "string", enum: ["cliente", "tienda", "promotor", "supervisor", "categoria"] },
        orden: { type: "string", enum: ["mejores", "peores"], description: "default: mejores" },
        limit: { type: "number", description: "default 15, máx 60" },
        ...FILTER_PROPS,
      },
    },
    run: async (args) => {
      const keyFn = DIMENSIONS[String(args.dimension ?? "") as keyof typeof DIMENSIONS];
      if (!keyFn) return { error: "dimension inválida" };
      const data = await fsRows(readFilters(args));
      if (data.length === 0) return { sin_datos: true };
      const limit = limitOf(args.limit, 15, 60);
      const list = [...groupShare(data, keyFn).entries()]
        .map(([nombre, g]) => {
          const s = shareOf(g.acc);
          const target = targetPonderado(g.rows);
          return {
            nombre,
            ...s,
            tiendas: new Set(g.rows.map((r) => r.storeName)).size,
            objetivo: target,
            delta_vs_objetivo: target === null || s.share === null ? null : round1(s.share - target),
          };
        })
        .filter((x) => x.totalUnits > 0);
      list.sort((a, b) =>
        args.orden === "peores" ? (a.share ?? 0) - (b.share ?? 0) : (b.share ?? 0) - (a.share ?? 0),
      );
      return { dimension: args.dimension, total_grupos: list.length, ranking: list.slice(0, limit) };
    },
  },
  {
    name: "get_fs_evolucion",
    description:
      "Evolución del Floor Share de Drean por semana o por mes fiscal, opcionalmente abierta por categoría. Usala para preguntas de tendencia ('¿cómo viene?', '¿mejoró?').",
    parameters: {
      type: "object",
      properties: {
        granularidad: { type: "string", enum: ["semana", "mes"], description: "default: semana" },
        abrir_por_categoria: { type: "boolean", description: "default false" },
        ...FILTER_PROPS,
      },
    },
    run: async (args) => {
      const data = await fsRows(readFilters(args));
      if (data.length === 0) return { sin_datos: true };
      const porMes = args.granularidad === "mes";
      const periodo = (r: FloorShareEnrichedRow) =>
        porMes ? r.month : `S${String(r.semana ?? 0).padStart(2, "0")}`;

      if (!args.abrir_por_categoria) {
        return {
          granularidad: porMes ? "mes" : "semana",
          serie: [...groupShare(data, periodo).entries()]
            .map(([p, g]) => ({ periodo: p, ...shareOf(g.acc) }))
            .sort((a, b) => a.periodo.localeCompare(b.periodo)),
        };
      }
      return {
        granularidad: porMes ? "mes" : "semana",
        serie: [...groupShare(data, (r) => `${periodo(r)}||${r.category}`).entries()]
          .map(([k, g]) => {
            const [p, categoria] = k.split("||");
            return { periodo: p, categoria, ...shareOf(g.acc), objetivo: fsTargetForCat(categoria) };
          })
          .sort((a, b) => a.periodo.localeCompare(b.periodo) || a.categoria.localeCompare(b.categoria)),
      };
    },
  },
];
