import { downloadFile, listFolderFiles } from "./drive";
import {
  isContactosFilename,
  parseContactosCsv,
  parseDataCsv,
  parseSemanaFromFilename,
  type ContactoRow,
  type DataRow,
} from "./parse";
import {
  buildFloorShareDataset,
  type FloorShareDataset,
} from "./dataset-floorshare";

export type Dataset = {
  rows: DataRow[];
  semanas: number[];
  generatedAt: string;
  fileCount: number;
  floorShare: FloorShareDataset | null;
};

function isCsv(name: string): boolean {
  return /\.csv$/i.test(name);
}

export async function buildDataset(folderId: string): Promise<Dataset> {
  const files = await listFolderFiles(folderId);
  const csvFiles = files.filter((f) => isCsv(f.name));

  const contactosFile = csvFiles.find((f) => isContactosFilename(f.name));
  let contactos: Map<string, ContactoRow> = new Map();
  if (contactosFile) {
    const buf = await downloadFile(contactosFile.id);
    contactos = parseContactosCsv(buf);
  }

  const dataFiles = csvFiles.filter((f) => f !== contactosFile);

  const bySemana = new Map<number, DataRow[]>();
  const cbPromise = Promise.all(
    dataFiles.map(async (file) => {
      const semana = parseSemanaFromFilename(file.name);
      if (semana === null) return;
      const buf = await downloadFile(file.id);
      const rows = parseDataCsv(buf, semana, contactos);
      const existing = bySemana.get(semana);
      if (!existing || rows.length > existing.length) {
        bySemana.set(semana, rows);
      }
    }),
  );

  const fsPromise = buildFloorShareDataset(folderId, contactos).catch((err) => {
    console.error("[dataset] floor share falló, sigo sin él:", err);
    return null;
  });

  const [, floorShare] = await Promise.all([cbPromise, fsPromise]);

  const allRows: DataRow[] = [];
  for (const rows of bySemana.values()) allRows.push(...rows);

  const semanas = [...bySemana.keys()].sort((a, b) => a - b);

  return {
    rows: allRows,
    semanas,
    generatedAt: new Date().toISOString(),
    fileCount: dataFiles.length,
    floorShare,
  };
}

// ---- Caché en memoria con TTL + single-flight ---------------------------
// Evita reconstruir el dataset en cada request mientras la copia esté
// fresca (TTL_MS). /api/refresh invalida explícitamente cuando se sube un
// archivo nuevo a Drive. Como cada instancia del server tiene su propio
// proceso, el caché vive por instancia: en serverless lo peor que pasa es
// que algún cold start no lo aproveche.

const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { folderId: string; builtAt: number; dataset: Dataset };

let cache: CacheEntry | null = null;
let inflight: { folderId: string; promise: Promise<Dataset> } | null = null;
let generation = 0;

export function invalidateDatasetCache(): void {
  generation++;
  cache = null;
  inflight = null;
}

export function getDatasetCacheStatus(): {
  cached: boolean;
  ageMs: number | null;
  ttlMs: number;
} {
  const ageMs = cache ? Date.now() - cache.builtAt : null;
  return { cached: cache !== null, ageMs, ttlMs: CACHE_TTL_MS };
}

export async function getDataset(folderId: string): Promise<Dataset> {
  if (
    cache &&
    cache.folderId === folderId &&
    Date.now() - cache.builtAt < CACHE_TTL_MS
  ) {
    return cache.dataset;
  }
  if (inflight && inflight.folderId === folderId) {
    return inflight.promise;
  }

  const myGen = generation;
  const promise = buildDataset(folderId).then((dataset) => {
    if (myGen === generation) {
      cache = { folderId, builtAt: Date.now(), dataset };
    }
    return dataset;
  });
  const entry = { folderId, promise };
  inflight = entry;
  promise.finally(() => {
    if (inflight === entry) inflight = null;
  });
  return promise;
}
