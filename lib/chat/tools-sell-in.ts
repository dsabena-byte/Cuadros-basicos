import "server-only";
import { loadCuadroBasico, loadClasificacion, loadVentas } from "@/lib/data";
import type { CuadroBasicoItem, VentaRow } from "@/lib/types";
import {
  OBJETIVO_SELLIN,
  calcularPorcentajes,
  filtrarCompras,
  mapasClasificacion,
  mesEnCursoDe,
  type VentanaCtx,
} from "@/lib/sellin-metrics";
import type { ChatTool, ChatToolCtx } from "./types";
import { limitOf, matches, norm, numList, strList } from "./filters";

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

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type Scope = {
  cb: CuadroBasicoItem[];
  compras: VentaRow[];
  ventanaCtx: VentanaCtx;
  vendedorPorCliente: Map<string, string>;
  gerentePorVendedor: Map<string, string>;
  generatedAt: string;
};

/** Carga CB + clasificación + ventas, acotado al vendedor de la sesión. */
async function loadScope(ctx: ChatToolCtx) {
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
  MESES.forEach((m, i) => {
    if (matches(names, m)) out.push(i + 1);
  });
  return out;
}

async function buildScope(args: Record<string, unknown>, ctx: ChatToolCtx): Promise<Scope> {
  const { cuadroBasico, clasificacion, ventas } = await loadScope(ctx);
  const { vendedorPorCliente, gerentePorVendedor } = mapasClasificacion(clasificacion);

  const meses = mesesArg(args.meses);
  // El vendedor de la sesión manda sobre cualquier vendedor que pida el modelo.
  const vendedores = ctx.vendedor ? undefined : strList(args.vendedores);
  const gerentes = strList(args.gerentes);
  const categorias = strList(args.categorias);
  const tipologias = strList(args.tipologias);
  const clientes = strList(args.clientes);

  const cb = cuadroBasico.filter((item) => {
    if (!matches(categorias, item.categoria)) return false;
    if (!matches(tipologias, item.tipologia)) return false;
    if (!matches(clientes, item.cliente)) return false;
    const v = vendedorPorCliente.get(item.cliente);
    if (!matches(vendedores, v)) return false;
    if (gerentes && !matches(gerentes, v ? gerentePorVendedor.get(v) : "")) return false;
    return true;
  });

  // Un único vendedor seleccionado se empuja también al filtro de compras
  // (igual que el dashboard); con varios, se filtra solo el CB.
  const unicoVendedor = ctx.vendedor
    ? new Set([norm(ctx.vendedor)])
    : vendedores && vendedores.size === 1
      ? vendedores
      : undefined;
  const compras = filtrarCompras(ventas.rows, { meses }).filter((c) =>
    matches(unicoVendedor, c.vendedor),
  );

  return {
    cb,
    compras,
    ventanaCtx: { hayFiltroMes: meses.length > 0, mesEnCurso: mesEnCursoDe(ventas.generatedAt) },
    vendedorPorCliente,
    gerentePorVendedor,
    generatedAt: ventas.generatedAt,
  };
}

function resumen(items: CuadroBasicoItem[], s: Scope) {
  const p = calcularPorcentajes(items, s.compras, s.ventanaCtx);
  const { itemsFaltantes, ...rest } = p;
  return { ...rest, objetivo: OBJETIVO_SELLIN, faltantes: itemsFaltantes.length };
}

const FILTER_PROPS = {
  meses: { type: "array", items: { type: "string" }, description: "meses por nombre o número, ej. ['Abril'] (opcional)" },
  categorias: { type: "array", items: { type: "string" }, description: "LAVADO / REFRIGERACION / COCCION (opcional)" },
  tipologias: { type: "array", items: { type: "string" }, description: "TOP 10 / GRANDES CUENTAS RESTO / HIPERMERCADOS / SMALL RETAILERS (opcional)" },
  clientes: { type: "array", items: { type: "string" }, description: "clientes (opcional)" },
  vendedores: { type: "array", items: { type: "string" }, description: "vendedores (opcional)" },
  gerentes: { type: "array", items: { type: "string" }, description: "gerencias: Cuentas Clave / Interior / Buenos Aires (opcional)" },
} as const;

export const sellInTools: ChatTool[] = [
  {
    name: "get_sellin_contexto",
    description:
      "Valores disponibles para filtrar en Sell-in (meses con data, categorías, tipologías, clientes, vendedores, gerencias), la fecha del último refresh y cómo funciona la ventana de facturación a mes cerrado. Llamalo PRIMERO si no sabés cómo se escribe un valor.",
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
          .map((m) => ({ numero: m, label: MESES[m - 1] })),
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
      "Cumplimiento de Cuadro Básico Sell-in: % CB, % Infaltables, % Estratégico (objetivo 80%) sobre el universo filtrado, más el corte por categoría y por tipología. Un item cumple si tuvo unidades facturadas (FC) o en backorder (BO) dentro de la ventana a mes cerrado.",
    parameters: { type: "object", properties: { ...FILTER_PROPS } },
    run: async (args, ctx) => {
      const s = await buildScope(args, ctx);
      if (s.cb.length === 0) return { sin_datos: true };
      const porCategoria = [...new Set(s.cb.map((c) => c.categoria))].map((categoria) => ({
        categoria,
        ...resumen(s.cb.filter((c) => c.categoria === categoria), s),
      }));
      const porTipologia = [...new Set(s.cb.map((c) => c.tipologia))].map((tipologia) => ({
        tipologia,
        ...resumen(s.cb.filter((c) => c.tipologia === tipologia), s),
      }));
      return {
        generado: s.generatedAt,
        totales: resumen(s.cb, s),
        por_categoria: porCategoria.sort((a, b) => b.pctCB - a.pctCB),
        por_tipologia: porTipologia.sort((a, b) => b.pctCB - a.pctCB),
      };
    },
  },
  {
    name: "get_sellin_ranking",
    description:
      "Ranking de cumplimiento CB Sell-in por dimensión (cliente, vendedor, gerencia, tipologia o categoria), con % CB / Infaltables / Estratégico, items cumplidos vs totales y el desvío vs el objetivo de 80%.",
    parameters: {
      type: "object",
      required: ["dimension"],
      properties: {
        dimension: { type: "string", enum: ["cliente", "vendedor", "gerencia", "tipologia", "categoria"] },
        orden: { type: "string", enum: ["mejores", "peores"], description: "default: mejores" },
        limit: { type: "number", description: "default 15, máx 60" },
        ...FILTER_PROPS,
      },
    },
    run: async (args, ctx) => {
      const s = await buildScope(args, ctx);
      if (s.cb.length === 0) return { sin_datos: true };
      const dim = String(args.dimension ?? "");
      const DIMS = ["cliente", "vendedor", "gerencia", "tipologia", "categoria"];
      if (!DIMS.includes(dim)) return { error: "dimension inválida", validas: DIMS };
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
      const limit = limitOf(args.limit, 15, 60);
      const list = [...groups.entries()].map(([nombre, items]) => ({
        nombre,
        ...resumen(items, s),
        ...(dim === "cliente"
          ? { vendedor: s.vendedorPorCliente.get(nombre) ?? "", tipologia: items[0]?.tipologia }
          : {}),
      }));
      list.sort((a, b) => (args.orden === "peores" ? a.pctCB - b.pctCB : b.pctCB - a.pctCB));
      return { dimension: dim, total_grupos: list.length, ranking: list.slice(0, limit) };
    },
  },
  {
    name: "get_sellin_faltantes",
    description:
      "SKUs del Cuadro Básico NO cumplidos (sin FC ni BO en la ventana): qué falta comprar, por cliente y categoría. Es la lista accionable para recuperar cumplimiento.",
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
      if (s.cb.length === 0) return { sin_datos: true };
      const faltantes = calcularPorcentajes(s.cb, s.compras, s.ventanaCtx).itemsFaltantes;
      const limit = limitOf(args.limit, 25, 100);
      const modo = String(args.agrupar_por ?? "sku");

      if (modo === "detalle") {
        return {
          total_faltantes: faltantes.length,
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
      return { agrupado_por: modo, total_faltantes: faltantes.length, top: list.slice(0, limit) };
    },
  },
];
