import "server-only";
import { getDataset } from "@/lib/data-source";
import type { FloorShareEnrichedRow } from "@/lib/dataset-floorshare";
import { FS_DREAN, FS_TARGETS, fsTargetForCat } from "@/lib/analisis-trade";
import { monthLabelFromCode } from "@/lib/parse-floorshare";
import type { ChatTool } from "./types";
import {
  candidatosCercanos,
  inSet,
  limitOf,
  matchesNum,
  norm,
  numList,
  resolveValues,
  round1,
  marcarMuestraChica,
  strList,
} from "./filters";

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
  /** Qué se interpretó de lo que pidió el modelo, y qué no pudo resolverse. */
  filtros: Record<string, string[]>;
  noResueltos: Record<string, { pedido: string; candidatos: string[] }[]>;
  /** Supuestos que hubo que hacer y la respuesta TIENE que explicitar. */
  interpretaciones: { pedido: string; usado: string; motivo: string }[];
};

/**
 * Resuelve lo pedido contra los valores que EXISTEN en la data: el usuario
 * escribe "Frávega" o "refri" y en el archivo figura "Frávega Once Ciudad" o
 * "refrigeracion".
 */
function readFilters(args: Record<string, unknown>, rows: FloorShareEnrichedRow[]): FsFilters {
  const filtros: Record<string, string[]> = {};
  const noResueltos: FsFilters["noResueltos"] = {};
  const interpretaciones: FsFilters["interpretaciones"] = [];
  const resolverSet = (campo: string, pedido: Set<string> | undefined, universo: Set<string>) => {
    const uni = [...universo];
    const r = resolveValues(pedido, uni);
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
  const resolver = (campo: string, pedido: unknown, universo: Set<string>) => {
    const uni = [...universo];
    const r = resolveValues(strList(pedido), uni);
    if (r.interpretaciones.length > 0) interpretaciones.push(...r.interpretaciones);
    if (r.matched.length > 0) filtros[campo] = r.matched;
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
  // Un solo formato de mes de cara al modelo: la etiqueta ("Abril 2026").
  // Tener código y etiqueta a la vez duplicaba cada mes en los candidatos.
  // Si el filtro llega como "2026-04", se traduce antes de resolver.
  const universoMeses = new Set(rows.map((r) => monthLabelFromCode(r.month)));
  const mesesPedidos = strList(args.meses);
  const mesesNormalizados = mesesPedidos
    ? new Set(
        [...mesesPedidos].map((m) =>
          /^\d{4}-\d{2}$/.test(m) ? norm(monthLabelFromCode(m)) : m,
        ),
      )
    : undefined;
  return {
    semanas,
    meses: resolverSet("meses", mesesNormalizados, universoMeses),
    categorias: resolver("categorias", args.categorias, new Set(rows.map((r) => r.category))),
    clientes: resolver("clientes", args.clientes, new Set(rows.map((r) => r.cliente))),
    tiendas: resolver("tiendas", args.tiendas, new Set(rows.map((r) => r.storeName))),
    promotores: resolver("promotores", args.promotores, new Set(rows.map((r) => r.promotor))),
    supervisores: resolver("supervisores", args.supervisores, new Set(rows.map((r) => r.supervisor))),
    filtros,
    noResueltos,
    interpretaciones,
  };
}

/** Los meses ya resueltos están siempre en formato etiqueta ("Abril 2026"). */
function mesMatches(set: Set<string> | undefined, r: FloorShareEnrichedRow): boolean {
  if (!set) return true;
  return set.has(monthLabelFromCode(r.month));
}

function applyFilters(rows: FloorShareEnrichedRow[], f: FsFilters): FloorShareEnrichedRow[] {
  return rows.filter(
    (r) =>
      matchesNum(f.semanas, r.semana) &&
      mesMatches(f.meses, r) &&
      inSet(f.categorias, r.category) &&
      inSet(f.clientes, r.cliente) &&
      inSet(f.tiendas, r.storeName) &&
      inSet(f.promotores, r.promotor) &&
      inSet(f.supervisores, r.supervisor),
  );
}

/** Encabezado común: qué se interpretó y qué no se pudo resolver. */
function meta(f: FsFilters) {
  const out: Record<string, unknown> = {};
  if (Object.keys(f.filtros).length > 0) out.filtros_aplicados = f.filtros;
  if (f.interpretaciones.length > 0) {
    out.interpretaciones = f.interpretaciones;
    out.aclarar =
      "Decile al usuario qué asumiste, con estas mismas palabras, antes de dar el número.";
  }
  if (Object.keys(f.noResueltos).length > 0) {
    out.sin_coincidencias = f.noResueltos;
    out.como_seguir =
      "Esos valores no existen en la data. Reintentá con alguno de los candidatos, o preguntale al usuario cuál quiso decir. NO respondas que no hay datos sin ofrecer los candidatos.";
  }
  return out;
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

/**
 * Cuántas unidades más de Drean habría que exhibir para alcanzar el objetivo,
 * a piso constante. Responde "¿cuánto me falta?" sin que el modelo despeje.
 */
function unidadesParaObjetivo(
  dreanUnits: number,
  totalUnits: number,
  objetivo: number | null,
): number | null {
  if (objetivo === null || totalUnits <= 0) return null;
  return Math.max(0, Math.ceil((objetivo / 100) * totalUnits) - dreanUnits);
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

async function scope(
  args: Record<string, unknown>,
): Promise<{ data: FloorShareEnrichedRow[]; f: FsFilters }> {
  const ds = await getDataset();
  const all = ds.floorShare?.rows ?? [];
  const f = readFilters(args, all);
  return { data: applyFilters(all, f), f };
}

const FILTER_PROPS = {
  semanas: { type: "array", items: { type: "number" }, description: "números de semana (opcional)" },
  meses: { type: "array", items: { type: "string" }, description: "'2026-04' o 'Abril 2026' (opcional)" },
  categorias: { type: "array", items: { type: "string" }, description: "lavado / refrigeracion / coccion; alcanza con 'refri' (opcional)" },
  clientes: { type: "array", items: { type: "string" }, description: "cadena; alcanza con parte del nombre (opcional)" },
  tiendas: { type: "array", items: { type: "string" }, description: "tienda; alcanza con parte del nombre (opcional)" },
  promotores: { type: "array", items: { type: "string" }, description: "promotor; alcanza con el apellido (opcional)" },
  supervisores: { type: "array", items: { type: "string" }, description: "supervisor; alcanza con el apellido (opcional)" },
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
      const { data, f } = await scope(args);
      if (data.length === 0) return { ...meta(f), sin_datos: true };

      const porCategoria = [...groupShare(data, DIMENSIONS.categoria).entries()]
        .map(([categoria, g]) => {
          const s = shareOf(g.acc);
          const target = fsTargetForCat(categoria);
          return {
            categoria,
            ...s,
            objetivo: target,
            delta_vs_objetivo: target === null || s.share === null ? null : round1(s.share - target),
            unidades_para_objetivo: unidadesParaObjetivo(s.dreanUnits, s.totalUnits, target),
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
        ...meta(f),
        total: {
          ...total,
          objetivo_ponderado: targetPonderado(data),
          unidades_para_objetivo: unidadesParaObjetivo(
            total.dreanUnits,
            total.totalUnits,
            targetPonderado(data),
          ),
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
      "Ranking de Floor Share de Drean por dimensión (cliente, tienda, promotor, supervisor o categoría), con share, unidades, cantidad de tiendas y desvío vs el objetivo ponderado. " +
      "Para cruzar condiciones usá min_tiendas / min_unidades (ej. '¿qué cliente con más de 10 tiendas tiene el mejor share?' → min_tiendas 11) en vez de filtrar vos el top: el ranking viene recortado y sacar conclusiones de ahí da respuestas falsas.",
    parameters: {
      type: "object",
      required: ["dimension"],
      properties: {
        dimension: { type: "string", enum: ["cliente", "tienda", "promotor", "supervisor", "categoria"] },
        orden: { type: "string", enum: ["mejores", "peores"], description: "default: mejores" },
        ordenar_por: {
          type: "string",
          enum: ["share", "unidades", "tiendas"],
          description: "criterio de orden. default: share",
        },
        min_tiendas: { type: "number", description: "solo grupos con al menos N tiendas (ej. 'clientes con más de 10 tiendas' → 11)" },
        min_unidades: { type: "number", description: "solo grupos con al menos N unidades de piso medidas" },
        limit: { type: "number", description: "default 15, máx 60" },
        ...FILTER_PROPS,
      },
    },
    run: async (args) => {
      const keyFn = DIMENSIONS[String(args.dimension ?? "") as keyof typeof DIMENSIONS];
      if (!keyFn) return { error: "dimension inválida", validas: Object.keys(DIMENSIONS) };
      const { data, f } = await scope(args);
      if (data.length === 0) return { ...meta(f), sin_datos: true };
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
            unidades_para_objetivo: unidadesParaObjetivo(s.dreanUnits, s.totalUnits, target),
          };
        })
        .filter((x) => x.totalUnits > 0);
      list.sort((a, b) =>
        args.orden === "peores" ? (a.share ?? 0) - (b.share ?? 0) : (b.share ?? 0) - (a.share ?? 0),
      );

      // El share es un cociente: un grupo con poco piso medido da valores
      // extremos. El orden NO se toca — el máximo real sigue primero — pero
      // cada fila lleva su volumen y el rótulo, para poder decir
      // "100%, sobre 24 unidades".
      const pisoTotal = list.reduce((acc, x) => acc + x.totalUnits, 0);
      const conPeso = list.map((x) => ({
        ...x,
        peso_del_piso_pct: round1(pisoTotal > 0 ? (x.totalUnits / pisoTotal) * 100 : null),
      }));
      const { filas, umbral, cuantas } = marcarMuestraChica(conPeso, (x) => x.totalUnits, 10);

      // Condiciones secundarias: el modelo no puede filtrarlas por su cuenta
      // sobre un ranking recortado sin sacar conclusiones falsas.
      const minTiendas = Number(args.min_tiendas);
      const minUnidades = Number(args.min_unidades);
      const cumplen = filas.filter(
        (x) =>
          (!Number.isFinite(minTiendas) || x.tiendas >= minTiendas) &&
          (!Number.isFinite(minUnidades) || x.totalUnits >= minUnidades),
      );

      if (cumplen.length === 0 && (Number.isFinite(minTiendas) || Number.isFinite(minUnidades))) {
        // Sin coincidencias: devolvemos los máximos reales para que la
        // respuesta sea útil en vez de un "no hay".
        const maxTiendas = Math.max(0, ...filas.map((x) => x.tiendas));
        const maxUnidades = Math.max(0, ...filas.map((x) => x.totalUnits));
        return {
          ...meta(f),
          dimension: args.dimension,
          total_grupos: filas.length,
          ranking: [],
          ningun_grupo_cumple: {
            min_tiendas: Number.isFinite(minTiendas) ? minTiendas : null,
            min_unidades: Number.isFinite(minUnidades) ? minUnidades : null,
            max_tiendas_disponible: maxTiendas,
            max_unidades_disponible: maxUnidades,
            top_por_tiendas: [...filas].sort((a, b) => b.tiendas - a.tiendas).slice(0, 5),
          },
          como_seguir:
            "Ningún grupo llega a ese mínimo. Decilo con el máximo real que sí existe y ofrecé el mejor de `top_por_tiendas`; no digas que no hay data.",
        };
      }

      const criterio = String(args.ordenar_por ?? "share");
      const valorDe = (x: (typeof cumplen)[number]) =>
        criterio === "unidades" ? x.totalUnits : criterio === "tiendas" ? x.tiendas : (x.share ?? 0);
      cumplen.sort((a, b) =>
        args.orden === "peores" ? valorDe(a) - valorDe(b) : valorDe(b) - valorDe(a),
      );

      return {
        ...meta(f),
        dimension: args.dimension,
        ordenado_por: criterio,
        total_grupos: cumplen.length,
        mostrados: Math.min(cumplen.length, limit),
        ...(cumplen.length > limit
          ? {
              aviso_recorte:
                `Se muestran ${limit} de ${cumplen.length} grupos. NO concluyas que algo "no existe" mirando solo estos: ` +
                "usá min_tiendas / min_unidades / ordenar_por para que el filtro lo haga la tool.",
            }
          : {}),
        ranking: cumplen.slice(0, limit),
        ...(cuantas > 0
          ? {
              nota_muestra_chica:
                `Las filas con muestra_chica tienen menos de ${umbral} unidades de piso medidas: ` +
                "su share es extremo por el poco volumen, no porque dominen la góndola. " +
                "Si una de esas encabeza el ranking, dala igual como respuesta pero aclarando sobre cuántas unidades y qué peso tiene en el piso total.",
            }
          : {}),
      };
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
      const { data, f } = await scope(args);
      if (data.length === 0) return { ...meta(f), sin_datos: true };
      const porMes = args.granularidad === "mes";
      const periodo = (r: FloorShareEnrichedRow) =>
        porMes ? r.month : `S${String(r.semana ?? 0).padStart(2, "0")}`;

      if (!args.abrir_por_categoria) {
        return {
          ...meta(f),
          granularidad: porMes ? "mes" : "semana",
          serie: [...groupShare(data, periodo).entries()]
            .map(([p, g]) => ({ periodo: p, ...shareOf(g.acc) }))
            .sort((a, b) => a.periodo.localeCompare(b.periodo)),
        };
      }
      return {
        ...meta(f),
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
