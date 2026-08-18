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
