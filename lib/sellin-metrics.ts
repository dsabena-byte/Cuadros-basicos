import type {
  ClasificacionCliente,
  CuadroBasicoItem,
  Tipologia,
  VentaRow,
} from "./types";
import { matchesCB } from "./cb-match";

// ============================================================================
// Métricas de cumplimiento de CB Sell-in (dashboard /ventas).
//
// Estas funciones VIVÍAN dentro de components/Dashboard.tsx. Se extrajeron acá
// sin cambiar el comportamiento para que el copiloto de datos (/api/chat) use
// EXACTAMENTE las mismas fórmulas que la pantalla — si divergen, el chat
// contestaría números que no coinciden con el dashboard.
// ============================================================================

export const OBJETIVO_SELLIN = 80;

/** Mes fiscal "en curso" según cuándo se generó el archivo de ventas. */
export function mesEnCursoDe(generatedAt: string): number {
  return new Date(generatedAt).getMonth() + 1;
}

/**
 * Ventana de FACTURACIÓN a MES CERRADO por tipología: Small Retailers mira los
 * últimos 3 meses cerrados; el resto (Top 10, Grandes Cuentas Resto,
 * Hipermercados) mira los últimos 2.
 */
export function ventanaFC(tip: Tipologia, mesEnCurso: number): Set<number> {
  const n = tip === "SMALL RETAILERS" ? 3 : 2;
  const s = new Set<number>();
  for (let k = 1; k <= n; k++) {
    const m = mesEnCurso - k;
    if (m >= 1) s.add(m);
  }
  return s;
}

export type VentanaCtx = {
  /** true si el usuario eligió meses: el filtro ya acotó las compras. */
  hayFiltroMes: boolean;
  mesEnCurso: number;
};

export function enVentana(c: VentaRow, tip: Tipologia, ctx: VentanaCtx): boolean {
  if (ctx.hayFiltroMes) return true;    // el filtro de MES ya acotó las compras
  if (c.tipo === "BO") return true;     // BO acumulado, como estaba
  return ventanaFC(tip, ctx.mesEnCurso).has(c.mes); // FC: solo meses cerrados
}

/**
 * FC y BO se filtran por mes con semánticas distintas:
 *   - FC: por mes EXACTO. Una factura de marzo solo cuenta en marzo.
 *   - BO: ACUMULADO hasta el último mes seleccionado. Una BO de enero sigue
 *     pendiente en marzo si no se facturó antes.
 */
export function filtrarCompras(
  rows: VentaRow[],
  opts: { meses?: number[]; vendedor?: string | null },
): VentaRow[] {
  const mesesSel = new Set(opts.meses ?? []);
  const maxMesSel = mesesSel.size > 0 ? Math.max(...mesesSel) : null;
  const vendedor = opts.vendedor ?? null;
  return rows.filter((c) => {
    if (mesesSel.size > 0) {
      if (c.tipo === "FC") {
        if (!mesesSel.has(c.mes)) return false;
      } else if (maxMesSel !== null && c.mes > maxMesSel) {
        return false;
      }
    }
    if (vendedor && c.vendedor !== vendedor) return false;
    return true;
  });
}

export type PorcentajesCB = {
  pctCB: number;
  pctInf: number;
  pctEst: number;
  totalCB: number;
  cumplidosCB: number;
  totalInf: number;
  cumplidosInf: number;
  totalEst: number;
  cumplidosEst: number;
  /** Items del CB NO cumplidos (para desplegar los SKUs a recuperar). */
  itemsFaltantes: CuadroBasicoItem[];
};

/**
 * "Cumplido" = la suma de unidades (FC + BO) del par (cliente, sku), dentro de
 * la ventana a mes cerrado de la tipología, es > 0.
 */
export function calcularPorcentajes(
  items: CuadroBasicoItem[],
  compras: VentaRow[],
  ctx: VentanaCtx,
): PorcentajesCB {
  const cumplido = (item: CuadroBasicoItem) => {
    let total = 0;
    for (const c of compras) {
      if (matchesCB(c, item) && enVentana(c, item.tipologia, ctx)) total += c.unidades;
    }
    return total > 0;
  };
  const totalCB = items.length;
  const cumplidosCB = items.filter(cumplido).length;
  const inf = items.filter((i) => i.tipo === "INFALTABLE");
  const est = items.filter((i) => i.tipo === "ESTRATEGICO");
  const cumplidosInf = inf.filter(cumplido).length;
  const cumplidosEst = est.filter(cumplido).length;
  return {
    pctCB: totalCB > 0 ? Math.round((cumplidosCB / totalCB) * 100) : 0,
    pctInf: inf.length > 0 ? Math.round((cumplidosInf / inf.length) * 100) : 0,
    pctEst: est.length > 0 ? Math.round((cumplidosEst / est.length) * 100) : 0,
    totalCB,
    cumplidosCB,
    totalInf: inf.length,
    cumplidosInf,
    totalEst: est.length,
    cumplidosEst,
    itemsFaltantes: items.filter((i) => !cumplido(i)),
  };
}

/** cliente → vendedor y vendedor → gerente, desde la clasificación. */
export function mapasClasificacion(clasificacion: ClasificacionCliente[]) {
  const vendedorPorCliente = new Map<string, string>();
  const gerentePorVendedor = new Map<string, string>();
  for (const c of clasificacion) {
    vendedorPorCliente.set(c.cliente, c.vendedor);
    gerentePorVendedor.set(c.vendedor, c.gerente);
  }
  return { vendedorPorCliente, gerentePorVendedor };
}
