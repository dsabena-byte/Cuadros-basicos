import "server-only";
import type { ChartSpec, ChartSeries } from "./types";

// ============================================================================
// Saneamiento y verificación de los gráficos que pide el modelo.
//
// El modelo arma el spec de render_chart a mano y se equivoca de formas que se
// ven feo o, peor, que mienten. Vistas en producción:
//   - concatenar un array por serie en vez de una fila por punto del eje X
//     → categorías duplicadas ("Agosto, Septiembre, Octubre, Agosto, ...")
//   - listar meses sin data → huecos en el gráfico
//   - graficar una métrica que NINGUNA tool devolvió → número inventado
//
// Acá se arregla lo arreglable y se RECHAZA lo que no se puede verificar
// contra lo que devolvieron las tools en este mismo turno.
// ============================================================================

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Orden canónico de una categoría del eje X, o null si no se reconoce. */
function ordenDe(x: string): number | null {
  const s = norm(x);
  const mes = MESES.findIndex((m) => s === m || s.startsWith(m.slice(0, 3)));
  if (mes >= 0) return mes;
  const ym = s.match(/^(\d{4})-(\d{2})$/);
  if (ym) return Number(ym[1]) * 12 + Number(ym[2]);
  const sem = s.match(/^(?:s|sem|semana)\s*(\d{1,2})$/);
  if (sem) return Number(sem[1]);
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return null;
}

/** Todos los números que devolvieron las tools, para verificar el gráfico. */
export function recolectarNumeros(valor: unknown, out: Set<string> = new Set()): Set<string> {
  if (typeof valor === "number" && Number.isFinite(valor)) {
    out.add(valor.toFixed(1));
    out.add(String(Math.round(valor)));
  } else if (Array.isArray(valor)) {
    for (const v of valor) recolectarNumeros(v, out);
  } else if (valor && typeof valor === "object") {
    for (const v of Object.values(valor as Record<string, unknown>)) recolectarNumeros(v, out);
  }
  return out;
}

function trazable(v: number, universo: Set<string>): boolean {
  return universo.has(v.toFixed(1)) || universo.has(String(Math.round(v)));
}

export type ResultadoChart =
  | { ok: true; spec: ChartSpec; notas: string[] }
  | { ok: false; error: string };

export function normalizarChartSpec(raw: unknown, numerosDeTools: Set<string>): ResultadoChart {
  const spec = (raw ?? {}) as Partial<ChartSpec>;
  const xKey = typeof spec.xKey === "string" ? spec.xKey : "";
  const series = Array.isArray(spec.series) ? (spec.series as ChartSeries[]) : [];
  const filas = Array.isArray(spec.data) ? (spec.data as Record<string, unknown>[]) : [];
  if (!xKey || series.length === 0 || filas.length === 0) {
    return { ok: false, error: "El spec necesita xKey, series y data no vacíos." };
  }

  const notas: string[] = [];
  const claves = series.map((s) => s.key).filter(Boolean);

  // 1) Una fila por categoría del eje X: si el modelo concatenó arrays, las
  //    filas repetidas se fusionan en vez de duplicar la categoría.
  const porX = new Map<string, Record<string, number | null>>();
  const orden: string[] = [];
  let fusionadas = 0;
  for (const fila of filas) {
    if (!fila || typeof fila !== "object") continue;
    const x = String(fila[xKey] ?? "").trim();
    if (!x) continue;
    let acc = porX.get(x);
    if (!acc) {
      acc = {};
      porX.set(x, acc);
      orden.push(x);
    } else {
      fusionadas++;
    }
    for (const k of claves) {
      const v = fila[k];
      const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
      // Un valor real nunca se pisa con null: al fusionar gana el que existe.
      if (Number.isFinite(n)) acc[k] = n;
      else if (!(k in acc)) acc[k] = null;
    }
  }
  if (fusionadas > 0) notas.push(`${fusionadas} fila(s) duplicada(s) del eje X fusionadas`);

  // 2) Categorías sin ningún dato: se descartan. Esto elimina los meses que el
  //    modelo agrega "para completar" y que no existen en la data.
  const conDatos = orden.filter((x) => claves.some((k) => porX.get(x)?.[k] != null));
  const vacias = orden.length - conDatos.length;
  if (vacias > 0) notas.push(`${vacias} categoría(s) sin datos descartadas`);
  if (conDatos.length === 0) {
    return { ok: false, error: "Ninguna categoría del eje X tiene datos. Traé la serie con una tool antes de graficar." };
  }

  // 3) Verificación anti-invento: cada valor tiene que venir de una tool.
  const noTrazables: string[] = [];
  const seriesOk: ChartSeries[] = [];
  for (const s of series) {
    const valores = conDatos
      .map((x) => porX.get(x)?.[s.key])
      .filter((v): v is number => typeof v === "number");
    if (valores.length === 0) {
      notas.push(`serie "${s.label || s.key}" sin datos, descartada`);
      continue;
    }
    const inventados = valores.filter((v) => !trazable(v, numerosDeTools));
    if (inventados.length > 0) {
      noTrazables.push(`"${s.label || s.key}" (${inventados.slice(0, 4).join(", ")})`);
      continue;
    }
    seriesOk.push(s);
  }
  if (noTrazables.length > 0) {
    return {
      ok: false,
      error:
        `Estos valores no vinieron de ninguna tool de este tablero: ${noTrazables.join("; ")}. ` +
        "No inventes números ni mezcles métricas de otros tableros. Traé la data con una tool y volvé a graficar solo con esos valores, " +
        "o explicale al usuario qué parte no podés responder desde acá.",
    };
  }
  if (seriesOk.length === 0) {
    return { ok: false, error: "No quedó ninguna serie con datos para graficar." };
  }

  // 4) Orden del eje X: cronológico cuando se reconoce (meses, YYYY-MM,
  //    semanas, números); si no, se respeta el orden de aparición.
  const ordenables = conDatos.map((x) => ({ x, o: ordenDe(x) }));
  if (ordenables.every((e) => e.o !== null)) {
    ordenables.sort((a, b) => (a.o as number) - (b.o as number));
  }

  const data = ordenables.map(({ x }) => {
    const fila: Record<string, string | number | null> = { [xKey]: x };
    for (const s of seriesOk) fila[s.key] = porX.get(x)?.[s.key] ?? null;
    return fila;
  });

  const tipo = spec.type === "line" || spec.type === "composed" ? spec.type : "bar";
  return {
    ok: true,
    notas,
    spec: {
      type: tipo,
      title: typeof spec.title === "string" ? spec.title : undefined,
      xKey,
      data,
      series: seriesOk,
    },
  };
}
