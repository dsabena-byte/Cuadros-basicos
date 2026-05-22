// Cliente REST de Supabase. Usa el anon key porque las tablas que consume
// el dashboard son lectura pública (no hay RLS sensible). Si en algún
// momento se agrega RLS más estricto, hay que cambiar a service role en el
// server o pasar JWT del usuario.
//
// Pagina con header `Range` (Supabase devuelve Content-Range con total).
// La primera request usa `count=exact` para saber el total y disparar
// el resto de las páginas en paralelo.

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function supabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function assertSupabaseConfigured(): void {
  if (!supabaseConfigured()) {
    throw new Error(
      "Supabase no está configurado: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
}

type QueryParams = Record<string, string | undefined>;

const PAGE_SIZE = 1000;
const MAX_ROWS = 500_000;

export async function supabaseSelectAll<T = Record<string, unknown>>(
  table: string,
  query: QueryParams = {},
): Promise<T[]> {
  assertSupabaseConfigured();

  // Primera request: trae la primera página y el total (Content-Range).
  const first = await fetchRange<T>(table, query, 0, PAGE_SIZE - 1, { exact: true });
  if (first.rows.length < PAGE_SIZE) return first.rows;

  // Si no llegó total exacto, fallback a paginación secuencial (poco común).
  if (first.total === null) {
    return paginateSequential(table, query, first.rows);
  }

  if (first.total > MAX_ROWS) {
    throw new Error(`supabaseSelectAll(${table}) excede el límite de ${MAX_ROWS} filas (total=${first.total})`);
  }

  // El resto en paralelo. Cap de concurrencia para no saturar Supabase ni el
  // event loop del runtime serverless.
  const pages: Array<[number, number]> = [];
  for (let offset = PAGE_SIZE; offset < first.total; offset += PAGE_SIZE) {
    pages.push([offset, Math.min(offset + PAGE_SIZE - 1, first.total - 1)]);
  }

  const CONCURRENCY = 8;
  const results: T[][] = new Array(pages.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= pages.length) return;
      const [from, to] = pages[i];
      const p = await fetchRange<T>(table, query, from, to, { exact: false });
      results[i] = p.rows;
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pages.length) }, worker));

  const out: T[] = first.rows.slice();
  for (const chunk of results) out.push(...chunk);
  return out;
}

// Fallback raro cuando Supabase no devuelve count exact (ej. tabla muy grande
// con count timeout). Mantiene el comportamiento viejo.
async function paginateSequential<T>(
  table: string,
  query: QueryParams,
  firstPage: T[],
): Promise<T[]> {
  const out: T[] = firstPage.slice();
  let offset = PAGE_SIZE;
  while (true) {
    const page = await fetchRange<T>(table, query, offset, offset + PAGE_SIZE - 1, { exact: false });
    out.push(...page.rows);
    if (page.rows.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
    if (offset > MAX_ROWS) {
      throw new Error(`supabaseSelectAll(${table}) excede el límite de ${MAX_ROWS} filas`);
    }
  }
  return out;
}

async function fetchRange<T>(
  table: string,
  query: QueryParams,
  from: number,
  to: number,
  opts: { exact: boolean },
): Promise<{ rows: T[]; total: number | null }> {
  const qp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) qp.set(k, v);
  }
  const url = `${SUPABASE_URL}/rest/v1/${table}${qp.toString() ? "?" + qp.toString() : ""}`;
  // `count=exact` solo en la primera request — es la query cara (full count
  // sobre la tabla); en las siguientes no la pedimos.
  const headers: Record<string, string> = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Range: `${from}-${to}`,
    "Range-Unit": "items",
  };
  if (opts.exact) headers["Prefer"] = "count=exact";
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${table} ${from}-${to} → ${res.status}: ${body}`);
  }
  const rows = (await res.json()) as T[];
  const contentRange = res.headers.get("content-range") ?? "";
  const totalStr = contentRange.split("/")[1] ?? "";
  const total = totalStr && totalStr !== "*" ? parseInt(totalStr, 10) : null;
  return { rows, total: Number.isFinite(total as number) ? total : null };
}
