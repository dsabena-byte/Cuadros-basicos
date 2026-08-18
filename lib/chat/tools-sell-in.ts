import "server-only";
import { loadCuadroBasico, loadClasificacion, loadVentas } from "@/lib/data";
import type { ClasificacionCliente, CuadroBasicoItem, VentasFile } from "@/lib/types";
import {
  MESES_LABEL,
  OBJETIVO_SELLIN,
  calcularPorcentajes,
  evolucionMensualCB,
  filtrarCompras,
  mapasClasificacion,
  mesEnCursoDe,
  type VentanaCtx,
} from "@/lib/sellin-metrics";
import type { ChatTool, ChatToolCtx } from "./types";
import {
  candidatosCercanos,
  faltanParaObjetivo,
  inSet,
  limitOf,
  norm,
  numList,
  resolveValues,
  marcarMuestraChica,
  strList,
} from "./filters";

// ============================================================================
// Tools del dashboard "Cuadro Básico Sell-in" (/ventas).
//
// Reusa lib/sellin-metrics.ts — las MISMAS funciones que renderizan la
// pantalla, así el copiloto no puede divergir de los KPIs que ve el usuario.
//
// SEGURIDAD: `ctx.vendedor` viene de la cookie de sesión verificada en
// /api/chat. Si el usuario tiene rol "vendedor", TODA la data se acota a sus
// clientes antes de calcular, igual que hace el server component de /ventas.
// ============================================================================

type Scope = {
  cb: CuadroBasicoItem[];
  ventas: VentasFile;
  compras: ReturnType<typeof filtrarCompras>;
  ventanaCtx: VentanaCtx;
  meses: number[];
  vendedorUnico: string | null;
  vendedorPorCliente: Map<string, string>;
  gerentePorVendedor: Map<string, string>;
  /** Qué interpretó de lo que pidió el modelo, y qué no pudo resolver. */
  filtros: Record<string, string[]>;
  noResueltos: Record<string, { pedido: string; candidatos: string[] }[]>;
  /** Supuestos que hubo que hacer y la respuesta TIENE que explicitar. */
  interpretaciones: { pedido: string; usado: string; motivo: string }[];
};

/** Carga CB + clasificación + ventas, acotado al vendedor de la sesión. */
async function loadScope(ctx: ChatToolCtx): Promise<{
  cuadroBasico: CuadroBasicoItem[];
  clasificacion: ClasificacionCliente[];
  ventas: VentasFile;
}> {
  const [cuadroBasico, clasificacion, ventas] = await Promise.all([
    loadCuadroBasico(),
    loadClasificacion(),
    loadVentas(),
  ]);
  if (!ctx.vendedor) return { cuadroBasico, clasificacion, ventas };
  const allowed = new Set(
    clasificacion.filter((c) => c.vendedor === ctx.vendedor).map((c) => c.cliente),
  );
  return {
    cuadroBasico: cuadroBasico.filter((c) => allowed.has(c.cliente)),
    clasificacion: clasificacion.filter((c) => allowed.has(c.cliente)),
    ventas: { ...ventas, rows: ventas.rows.filter((r) => allowed.has(r.cliente)) },
  };
}

/** Convierte nombres de mes ("Abril") o números a números 1..12. */
function mesesArg(v: unknown): number[] {
  const nums = numList(v);
  if (nums) return [...nums].filter((n) => n >= 1 && n <= 12);
  const names = strList(v);
  if (!names) return [];
  const out: number[] = [];
  MESES_LABEL.forEach((m, i) => {
    const k = norm(m);
    for (const q of names) if (k === q || k.startsWith(q)) out.push(i + 1);
  });
  return [...new Set(out)];
}

async function buildScope(args: Record<string, unknown>, ctx: ChatToolCtx): Promise<Scope> {
  const { cuadroBasico, clasificacion, ventas } = await loadScope(ctx);
  const { vendedorPorCliente, gerentePorVendedor } = mapasClasificacion(clasificacion);

  const filtros: Record<string, string[]> = {};
  const noResueltos: Scope["noResueltos"] = {};
  const interpretaciones: Scope["interpretaciones"] = [];

  // Resuelve lo que pidió el modelo contra los valores que EXISTEN en la data
  // ("Pombo" → "POMBO MARCELO", "Fravega" → "FRAVEGA S A C I E I").
  const resolver = (campo: string, pedido: unknown, universo: Iterable<string>) => {
    const uni = [...universo];
    const r = resolveValues(strList(pedido), uni);
    if (r.matched.length > 0) filtros[campo] = r.matched;
    if (r.interpretaciones.length > 0) interpretaciones.push(...r.interpretaciones);
    if (r.unmatched.length > 0) {
      noResueltos[campo] = r.unmatched.map((p) => ({
        pedido: p,
        candidatos: candidatosCercanos(p, uni),
        total_disponibles: uni.length,
      }));
    }
    return r.set;
  };

  const categorias = resolver("categorias", args.categorias, new Set(cuadroBasico.map((c) => c.categoria)));
  const tipologias = resolver("tipologias", args.tipologias, new Set(cuadroBasico.map((c) => c.tipologia)));
  const clientes = resolver("clientes", args.clientes, new Set(cuadroBasico.map((c) => c.cliente)));
  const gerentes = resolver("gerentes", args.gerentes, new Set(clasificacion.map((c) => c.gerente)));
  // El vendedor de la sesión manda sobre cualquier vendedor que pida el modelo.
  const vendedores = ctx.vendedor
    ? new Set([ctx.vendedor])
    : resolver("vendedores", args.vendedores, new Set(clasificacion.map((c) => c.vendedor)));

  const meses = mesesArg(args.meses);
  if (meses.length > 0) filtros.meses = meses.map((m) => MESES_LABEL[m - 1]);

  const cb = cuadroBasico.filter((item) => {
    if (!inSet(categorias, item.categoria)) return false;
    if (!inSet(tipologias, item.tipologia)) return false;
    if (!inSet(clientes, item.cliente)) return false;
    const v = vendedorPorCliente.get(item.cliente);
    if (!inSet(vendedores, v ?? "")) return false;
    if (gerentes && !inSet(gerentes, (v ? gerentePorVendedor.get(v) : "") ?? "")) return false;
    return true;
  });

  // Un único vendedor seleccionado se empuja también al filtro de compras
  // (igual que el dashboard); con varios, se filtra solo el CB.
  const vendedorUnico =
    ctx.vendedor ?? (vendedores && vendedores.size === 1 ? [...vendedores][0] : null);
  const compras = filtrarCompras(ventas.rows, { meses, vendedor: vendedorUnico });

  return {
    cb,
    ventas,
    compras,
    ventanaCtx: { hayFiltroMes: meses.length > 0, mesEnCurso: mesEnCursoDe(ventas.generatedAt) },
    meses,
    vendedorUnico,
    vendedorPorCliente,
    gerentePorVendedor,
    filtros,
    noResueltos,
    interpretaciones,
  };
}

/** Encabezado común: qué se interpretó y qué no se pudo resolver. */
function meta(s: Scope) {
  const out: Record<string, unknown> = { generado: s.ventas.generatedAt };
  if (Object.keys(s.filtros).length > 0) out.filtros_aplicados = s.filtros;
  if (s.interpretaciones.length > 0) {
    out.interpretaciones = s.interpretaciones;
    out.aclarar = "Decile al usuario qué asumiste, con estas mismas palabras, antes de dar el número.";
  }
  if (Object.keys(s.noResueltos).length > 0) {
    out.sin_coincidencias = s.noResueltos;
    out.como_seguir =
      "Esos valores no existen en la data. Reintentá con alguno de los candidatos, o preguntale al usuario cuál quiso decir. NO respondas que no hay datos sin ofrecer los candidatos.";
  }
  return out;
}

function resumen(items: CuadroBasicoItem[], s: Scope) {
  const p = calcularPorcentajes(items, s.compras, s.ventanaCtx);
  const { itemsFaltantes, ...rest } = p;
  return {
    ...rest,
    objetivo: OBJETIVO_SELLIN,
    delta_vs_objetivo: rest.pctCB - OBJETIVO_SELLIN,
    // Cuántos items más habría que cumplir para llegar al objetivo.
    faltan_para_objetivo: faltanParaObjetivo(rest.totalCB, rest.cumplidosCB, OBJETIVO_SELLIN),
    skus_no_cumplidos: itemsFaltantes.length,
  };
}

const FILTER_PROPS = {
  meses: { type: "array", items: { type: "string" }, description: "meses por nombre o número, ej. ['Abril'] (opcional)" },
  categorias: { type: "array", items: { type: "string" }, description: "LAVADO / REFRIGERACION / COCCION (opcional)" },
  tipologias: { type: "array", items: { type: "string" }, description: "TOP 10 / GRANDES CUENTAS RESTO / HIPERMERCADOS / SMALL RETAILERS (opcional)" },
  clientes: { type: "array", items: { type: "string" }, description: "cliente; alcanza con parte del nombre, ej. 'Fravega' (opcional)" },
  vendedores: { type: "array", items: { type: "string" }, description: "vendedor; alcanza con el apellido, ej. 'Pombo' (opcional)" },
  gerentes: { type: "array", items: { type: "string" }, description: "gerencia: Cuentas Clave / Interior / Buenos Aires (opcional)" },
} as const;

const DIMS = ["cliente", "vendedor", "gerencia", "tipologia", "categoria"] as const;

export const sellInTools: ChatTool[] = [
  {
    name: "get_sellin_contexto",
    description:
      "Valores disponibles para filtrar en Sell-in (meses con data, categorías, tipologías, clientes, vendedores, gerencias), la fecha del último refresh y cómo funciona la ventana de facturación a mes cerrado. Llamalo si una tool devuelve `sin_coincidencias` o si no sabés qué valores existen.",
    parameters: { type: "object", properties: {} },
    run: async (_args, ctx) => {
      const { cuadroBasico, clasificacion, ventas } = await loadScope(ctx);
      return {
        objetivo_cb: OBJETIVO_SELLIN,
        generado: ventas.generatedAt,
        fuente: ventas.source,
        mes_en_curso: mesEnCursoDe(ventas.generatedAt),
        ventana_facturacion:
          "Sin filtro de mes, FC cuenta solo los meses CERRADOS: 3 para SMALL RETAILERS, 2 para el resto. BO cuenta acumulado.",
        alcance_vendedor: ctx.vendedor ?? "todos",
        meses_con_data: [...new Set(ventas.rows.map((r) => r.mes))]
          .sort((a, b) => a - b)
          .map((m) => ({ numero: m, label: MESES_LABEL[m - 1] })),
        categorias: [...new Set(cuadroBasico.map((c) => c.categoria))].sort(),
        tipologias: [...new Set(cuadroBasico.map((c) => c.tipologia))].sort(),
        clientes: [...new Set(cuadroBasico.map((c) => c.cliente))].sort(),
        vendedores: [...new Set(clasificacion.map((c) => c.vendedor))].filter(Boolean).sort(),
        gerencias: [...new Set(clasificacion.map((c) => c.gerente))].filter(Boolean).sort(),
        items_cb: cuadroBasico.length,
      };
    },
  },
  {
    name: "get_sellin_resumen",
    description:
      "Cumplimiento de Cuadro Básico Sell-in sobre el universo filtrado: % CB, % Infaltables, % Estratégico (objetivo 80%), items cumplidos vs totales, cuántos faltan para llegar al 80%, y el corte por categoría y por tipología. Un item cumple si tuvo unidades facturadas (FC) o en backorder (BO) dentro de la ventana a mes cerrado.",
    parameters: { type: "object", properties: { ...FILTER_PROPS } },
    run: async (args, ctx) => {
      const s = await buildScope(args, ctx);
      if (s.cb.length === 0) return { ...meta(s), sin_datos: true };
      const porCategoria = [...new Set(s.cb.map((c) => c.categoria))].map((categoria) => ({
        categoria,
        ...resumen(s.cb.filter((c) => c.categoria === categoria), s),
      }));
      const porTipologia = [...new Set(s.cb.map((c) => c.tipologia))].map((tipologia) => ({
        tipologia,
        ...resumen(s.cb.filter((c) => c.tipologia === tipologia), s),
      }));
      return {
        ...meta(s),
        totales: resumen(s.cb, s),
        por_categoria: porCategoria.sort((a, b) => b.pctCB - a.pctCB),
        por_tipologia: porTipologia.sort((a, b) => b.pctCB - a.pctCB),
      };
    },
  },
  {
    name: "get_sellin_evolucion",
    description:
      "Evolución MENSUAL del cumplimiento de CB Sell-in, mes por mes desde Enero hasta el mes en curso — la misma serie del gráfico 'Evolución mensual' de la pantalla. Usala SIEMPRE que pregunten por evolución, tendencia, 'cómo viene mes a mes' o comparación entre meses. Acepta los mismos filtros que el resumen.",
    parameters: { type: "object", properties: { ...FILTER_PROPS } },
    run: async (args, ctx) => {
      const s = await buildScope(args, ctx);
      if (s.cb.length === 0) return { ...meta(s), sin_datos: true };
      const serie = evolucionMensualCB(s.cb, s.ventas.rows, {
        generatedAt: s.ventas.generatedAt,
        vendedor: s.vendedorUnico,
      });
      return {
        ...meta(s),
        objetivo: OBJETIVO_SELLIN,
        nota: "La serie llega hasta el mes en curso; no hay data de meses posteriores.",
        serie,
      };
    },
  },
  {
    name: "get_sellin_ranking",
    description:
      "Ranking de cumplimiento CB Sell-in por dimensión (cliente, vendedor, gerencia, tipologia o categoria): % CB / Infaltables / Estratégico, items cumplidos vs totales, desvío vs el objetivo de 80% y cuántos items faltan para alcanzarlo. Usala también para responder '¿qué le falta a X para llegar al 80%?' filtrando por ese X.",
    parameters: {
      type: "object",
      required: ["dimension"],
      properties: {
        dimension: { type: "string", enum: [...DIMS] },
        orden: { type: "string", enum: ["mejores", "peores"], description: "default: mejores" },
        limit: { type: "number", description: "default 15, máx 60" },
        ...FILTER_PROPS,
      },
    },
    run: async (args, ctx) => {
      const dim = String(args.dimension ?? "");
      if (!(DIMS as readonly string[]).includes(dim)) {
        return { error: "dimension inválida", validas: DIMS };
      }
      const s = await buildScope(args, ctx);
      if (s.cb.length === 0) return { ...meta(s), sin_datos: true };
      const keyOf = (item: CuadroBasicoItem): string => {
        if (dim === "cliente") return item.cliente;
        if (dim === "tipologia") return item.tipologia;
        if (dim === "categoria") return item.categoria;
        const v = s.vendedorPorCliente.get(item.cliente) ?? "";
        if (dim === "vendedor") return v || "Sin vendedor";
        return (v ? s.gerentePorVendedor.get(v) : "") || "Sin gerencia";
      };
      const groups = new Map<string, CuadroBasicoItem[]>();
      for (const item of s.cb) {
        const k = keyOf(item);
        const arr = groups.get(k) ?? [];
        arr.push(item);
        groups.set(k, arr);
      }
      const list = [...groups.entries()].map(([nombre, items]) => ({
        nombre,
        ...resumen(items, s),
        ...(dim === "cliente"
          ? { vendedor: s.vendedorPorCliente.get(nombre) ?? "", tipologia: items[0]?.tipologia }
          : {}),
      }));
      list.sort((a, b) => (args.orden === "peores" ? a.pctCB - b.pctCB : b.pctCB - a.pctCB));
      // % CB es un cociente: un cliente con 2 items da 0% o 100%. No se
      // reordena ni se oculta; se rotula para poder aclarar cuántos items son.
      const { filas, umbral, cuantas } = marcarMuestraChica(list, (x) => x.totalCB, 3);
      const limit = limitOf(args.limit, 15, 60);
      return {
        ...meta(s),
        dimension: dim,
        total_grupos: filas.length,
        ranking: filas.slice(0, limit),
        ...(cuantas > 0
          ? {
              nota_muestra_chica:
                `Las filas con muestra_chica tienen menos de ${umbral} items de CB: su % es extremo por el poco volumen. ` +
                "Si alguna encabeza el ranking, dala igual pero aclarando cuántos items son.",
            }
          : {}),
      };
    },
  },
  {
    name: "get_sellin_faltantes",
    description:
      "SKUs del Cuadro Básico NO cumplidos (sin FC ni BO en la ventana): qué falta comprar, por SKU o por cliente. Es la lista accionable para recuperar cumplimiento — usala cuando pregunten qué falta, qué comprar o cómo cerrar la brecha.",
    parameters: {
      type: "object",
      properties: {
        agrupar_por: { type: "string", enum: ["sku", "cliente", "detalle"], description: "default: sku" },
        limit: { type: "number", description: "default 25, máx 100" },
        ...FILTER_PROPS,
      },
    },
    run: async (args, ctx) => {
      const s = await buildScope(args, ctx);
      if (s.cb.length === 0) return { ...meta(s), sin_datos: true };
      const p = calcularPorcentajes(s.cb, s.compras, s.ventanaCtx);
      const faltantes = p.itemsFaltantes;
      const limit = limitOf(args.limit, 25, 100);
      const modo = String(args.agrupar_por ?? "sku");
      const cabecera = {
        ...meta(s),
        total_faltantes: faltantes.length,
        faltan_para_objetivo: faltanParaObjetivo(p.totalCB, p.cumplidosCB, OBJETIVO_SELLIN),
        nota: "faltan_para_objetivo = cuántos de estos habría que cumplir para llegar al 80%.",
      };

      if (modo === "detalle") {
        return {
          ...cabecera,
          items: faltantes.slice(0, limit).map((i) => ({
            sku: i.sku,
            cliente: i.cliente,
            categoria: i.categoria,
            tipo: i.tipo,
            tipologia: i.tipologia,
          })),
        };
      }
      const keyOf = (i: CuadroBasicoItem) => (modo === "cliente" ? i.cliente : i.sku);
      const map = new Map<string, { faltantes: number; categorias: Set<string>; otros: Set<string> }>();
      for (const i of faltantes) {
        const k = keyOf(i);
        let g = map.get(k);
        if (!g) {
          g = { faltantes: 0, categorias: new Set(), otros: new Set() };
          map.set(k, g);
        }
        g.faltantes++;
        g.categorias.add(i.categoria);
        g.otros.add(modo === "cliente" ? i.sku : i.cliente);
      }
      const list = [...map.entries()]
        .map(([nombre, g]) => ({
          nombre,
          faltantes: g.faltantes,
          categorias: [...g.categorias],
          [modo === "cliente" ? "skus" : "clientes"]: [...g.otros].slice(0, 12),
        }))
        .sort((a, b) => b.faltantes - a.faltantes);
      return { ...cabecera, agrupado_por: modo, top: list.slice(0, limit) };
    },
  },
];
