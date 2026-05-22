import { loadContactosFromSupabase } from "./contactos-supabase";
import { loadCBRowsFromSupabase } from "./cb-supabase";
import { buildFloorShareDatasetFromSupabase } from "./floorshare-supabase";
import type { Dataset } from "./dataset";

// Construye el Dataset completo leyendo desde Supabase. Mantiene la misma
// shape que buildDataset() (lib/dataset.ts) — así el dashboard no distingue
// origen.
export async function buildDatasetFromSupabase(): Promise<Dataset> {
  const contactos = await loadContactosFromSupabase();
  const [cb, floorShare] = await Promise.all([
    loadCBRowsFromSupabase(contactos),
    buildFloorShareDatasetFromSupabase(contactos).catch((err) => {
      console.error("[dataset-supabase] floor share falló, sigo sin él:", err);
      return null;
    }),
  ]);
  return {
    rows: cb.rows,
    semanas: cb.semanas,
    generatedAt: new Date().toISOString(),
    fileCount: cb.semanas.length,
    floorShare,
  };
}

// Caché en memoria + single-flight, igual que el flujo Drive.
const CACHE_TTL_MS = 5 * 60 * 1000;
type CacheEntry = { builtAt: number; dataset: Dataset };
let cache: CacheEntry | null = null;
let inflight: Promise<Dataset> | null = null;
let generation = 0;

export function invalidateDatasetSupabaseCache(): void {
  generation++;
  cache = null;
  inflight = null;
}

export async function getDatasetFromSupabase(): Promise<Dataset> {
  if (cache && Date.now() - cache.builtAt < CACHE_TTL_MS) return cache.dataset;
  if (inflight) return inflight;
  const myGen = generation;
  const promise = buildDatasetFromSupabase().then((dataset) => {
    if (myGen === generation) cache = { builtAt: Date.now(), dataset };
    return dataset;
  });
  inflight = promise;
  promise.finally(() => {
    if (inflight === promise) inflight = null;
  });
  return promise;
}
