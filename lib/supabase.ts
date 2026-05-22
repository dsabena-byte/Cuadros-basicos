// Cliente REST de Supabase. Usa el anon key porque las tablas que consume
// el dashboard son lectura pública (no hay RLS sensible). Si en algún
// momento se agrega RLS más estricto, hay que cambiar a service role en el
// server o pasar JWT del usuario.
//
// Pagina con header `Range` (Supabase devuelve Content-Range con total).
// `select` y `or`/`eq`/etc se pasan como query string siguiendo PostgREST.

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

export async function supabaseSelectAll<T = Record<string, unknown>>(
  table: string,
  query: QueryParams = {},
): Promise<T[]> {
  assertSupabaseConfigured();
  const out: T[] = [];
  let offset = 0;
  while (true) {
    const page = await fetchRange<T>(table, query, offset, offset + PAGE_SIZE - 1);
    out.push(...page.rows);
    if (page.rows.length < PAGE_SIZE) break;
    if (page.total !== null && offset + page.rows.length >= page.total) break;
    offset += PAGE_SIZE;
    if (offset > 500_000) {
      throw new Error(`supabaseSelectAll(${table}) excede el límite de 500k filas`);
    }
  }
  return out;
}

async function fetchRange<T>(
  table: string,
  query: QueryParams,
  from: number,
  to: number,
): Promise<{ rows: T[]; total: number | null }> {
  const qp = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) qp.set(k, v);
  }
  const url = `${SUPABASE_URL}/rest/v1/${table}${qp.toString() ? "?" + qp.toString() : ""}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Range: `${from}-${to}`,
      "Range-Unit": "items",
      Prefer: "count=exact",
    },
    cache: "no-store",
  });
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
