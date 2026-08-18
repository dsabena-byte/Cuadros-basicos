import "server-only";

// Helpers de filtrado tolerantes: el modelo escribe los valores de los filtros
// a mano ("Frávega", "fravega", "REFRIGERACION"), así que comparamos sin
// acentos, sin case y sin espacios de más. Si no matchea nada, mejor que la
// tool devuelva vacío y el modelo lo diga, a que invente.

export function norm(s: unknown): string {
  return (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Lee un arg como lista de strings normalizados. undefined = sin filtro. */
export function strList(v: unknown): Set<string> | undefined {
  const arr = Array.isArray(v) ? v : typeof v === "string" ? [v] : null;
  if (!arr) return undefined;
  const out = new Set(arr.map(norm).filter(Boolean));
  return out.size > 0 ? out : undefined;
}

/** Lee un arg como lista de números. undefined = sin filtro. */
export function numList(v: unknown): Set<number> | undefined {
  const arr = Array.isArray(v) ? v : typeof v === "number" || typeof v === "string" ? [v] : null;
  if (!arr) return undefined;
  const out = new Set(
    arr.map((x) => Number(x)).filter((n) => Number.isFinite(n)),
  );
  return out.size > 0 ? out : undefined;
}

export function matches(set: Set<string> | undefined, value: unknown): boolean {
  if (!set) return true;
  return set.has(norm(value));
}

export function matchesNum(set: Set<number> | undefined, value: unknown): boolean {
  if (!set) return true;
  return set.has(Number(value));
}

export function limitOf(v: unknown, def: number, max: number): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(Math.floor(n), max);
}

export function round1(n: number | null): number | null {
  return n === null || !Number.isFinite(n) ? null : Math.round(n * 10) / 10;
}

// ---------------------------------------------------------------------------
// Resolución de valores pedidos contra los que REALMENTE existen en la data.
//
// El modelo escribe lo que dijo el usuario ("Frávega"), pero en la data el
// cliente puede ser la razón social ("FRAVEGA S A C I E I") o la tienda venir
// con número ("1 - Frávega Once"). Comparar por igualdad exacta devolvía
// `sin_datos` en esos casos.
//
// Se resuelve UNA vez contra el universo de valores y se filtra después por
// pertenencia exacta, así las tools pueden además informar qué interpretaron.
// ---------------------------------------------------------------------------

function tokensOf(s: string): string[] {
  return s.split(" ").filter((t) => t.length >= 3);
}

/** Candidatos del universo que matchean `q`, por niveles de precisión. */
function candidatosPara(q: string, universo: Map<string, string[]>): string[] {
  const tiers: Array<(u: string) => boolean> = [
    (u) => u === q,
    (u) => u.startsWith(q),
    (u) => q.length >= 3 && u.includes(q),
  ];
  const toks = tokensOf(q);
  if (toks.length > 0) tiers.push((u) => toks.every((t) => u.includes(t)));

  for (const test of tiers) {
    const hits: string[] = [];
    for (const [normalizado, originales] of universo) {
      if (test(normalizado)) hits.push(...originales);
    }
    // El primer nivel que encuentra algo gana: un match exacto nunca queda
    // tapado por uno difuso.
    if (hits.length > 0) return hits;
  }
  return [];
}

export type Resuelto = {
  /** Valores reales a filtrar. undefined = sin filtro. */
  set: Set<string> | undefined;
  /** Qué se interpretó, para que la respuesta sea auditable. */
  matched: string[];
  /** Lo que el usuario pidió y no existe en la data. */
  unmatched: string[];
};

export function resolveValues(
  pedidos: Set<string> | undefined,
  universo: Iterable<string>,
): Resuelto {
  if (!pedidos) return { set: undefined, matched: [], unmatched: [] };

  const porNorm = new Map<string, string[]>();
  for (const v of universo) {
    const k = norm(v);
    if (!k) continue;
    const arr = porNorm.get(k);
    if (arr) arr.push(v);
    else porNorm.set(k, [v]);
  }

  const matched = new Set<string>();
  const unmatched: string[] = [];
  for (const q of pedidos) {
    const hits = candidatosPara(q, porNorm);
    if (hits.length === 0) unmatched.push(q);
    else for (const h of hits) matched.add(h);
  }
  return { set: matched, matched: [...matched], unmatched };
}

/** Filtro por pertenencia exacta al set ya resuelto. */
export function inSet(set: Set<string> | undefined, value: unknown): boolean {
  if (!set) return true;
  return set.has((value ?? "").toString());
}

/**
 * Cuando un valor pedido no existe, devolvemos candidatos parecidos en vez de
 * un simple "no hay datos": así el modelo puede reintentar o repreguntar en el
 * mismo turno, en lugar de contestar que no encontró nada.
 */
export function candidatosCercanos(
  q: string,
  universo: Iterable<string>,
  limit = 12,
): string[] {
  const toks = q.split(" ").filter(Boolean);
  const scored: Array<{ v: string; score: number }> = [];
  for (const v of universo) {
    const n = norm(v);
    if (!n) continue;
    let score = 0;
    for (const t of toks) {
      if (t.length >= 3 && n.includes(t)) score += 3;
      else if (t.length >= 2 && n.includes(t.slice(0, 2))) score += 1;
    }
    // Prefijo común con el query completo.
    let i = 0;
    while (i < Math.min(n.length, q.length) && n[i] === q[i]) i++;
    score += i;
    if (score > 0) scored.push({ v, score });
  }
  scored.sort((a, b) => b.score - a.score || a.v.localeCompare(b.v, "es"));
  if (scored.length > 0) return scored.slice(0, limit).map((x) => x.v);
  // Sin ningún parecido: devolvemos igual una muestra del universo, para que el
  // modelo pueda ofrecer opciones en vez de contestar "no hay datos".
  return [...universo].sort((a, b) => a.localeCompare(b, "es")).slice(0, limit);
}

/** Items que faltan cumplir para alcanzar un objetivo porcentual. */
export function faltanParaObjetivo(
  total: number,
  cumplidos: number,
  objetivoPct: number,
): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.ceil((objetivoPct / 100) * total) - cumplidos);
}
