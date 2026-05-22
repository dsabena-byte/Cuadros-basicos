import { listFolderFiles, downloadFile, findSubfolderId } from "./drive";
import Papa from "papaparse";
import type {
  CuadroBasicoItem,
  ClasificacionCliente,
  Tipologia,
  Categoria,
  TipoCB,
} from "./types";

// Importa Cuadro Básico + Clasificación de Clientes directo desde Drive,
// replicando la lógica de scripts/import-csv.mjs (que antes se corría
// manualmente y dejaba JSONs estáticos en data/).
//
// Env vars:
//   DRIVE_FOLDER_ID     ← folder padre (la usa también /api/data para Trade MKT)
//   DRIVE_CB_FOLDER_ID  ← opcional, override directo a la carpeta de CB
//
// Si no se setea DRIVE_CB_FOLDER_ID, busca un subfolder "cuadro-basico-ventas"
// dentro de DRIVE_FOLDER_ID. Si tampoco existe, usa DRIVE_FOLDER_ID directo.
//
// Cache en memoria con TTL para evitar pegarle a Drive en cada request.

// Match: "Cuadros-basicos-*", "Cuadro-basico-*", "Cuadros Basicos -*",
// "Cuadro Basico *", etc. — acepta espacio, guion o ambos entre las
// palabras y al final, para tolerar variantes de naming en Drive.
const CB_FILENAME_PATTERN = /^cuadros?[\s\-_]*basicos?/i;
const CLASIF_FILENAME_PATTERN = /^clasificacion[\s\-_]*clientes?/i;
const CB_SUBFOLDER_NAME = "cuadro-basico-ventas";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

const TIPOLOGIA_NORMALIZER: Record<string, Tipologia> = {
  "GRANDES CUENTAS TOP 10": "TOP 10",
  "GRANDES CUENTAS RESTO": "GRANDES CUENTAS RESTO",
  "GRANDES CUENTAS RESTO (46 CLIENTES)": "GRANDES CUENTAS RESTO",
  "HIPERMERCADOS": "HIPERMERCADOS",
  "SMALL RETAILERS": "SMALL RETAILERS",
};

function normTipologia(raw: string): Tipologia | null {
  const t = raw.trim().toUpperCase();
  if (TIPOLOGIA_NORMALIZER[t]) return TIPOLOGIA_NORMALIZER[t];
  for (const [key, val] of Object.entries(TIPOLOGIA_NORMALIZER)) {
    if (t.startsWith(key)) return val;
  }
  return null;
}

function parsePeso(s: string): number {
  const m = s.replace(/\s/g, "").replace(",", ".").replace("%", "");
  const n = Number(m);
  return Number.isFinite(n) ? n / 100 : 0;
}

function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s_\-]+/g, " ")
    .trim();
}

function pick(row: Record<string, string>, ...candidates: string[]): string {
  // Caché del lookup normalizado en el row (lazy, una sola vez por row).
  const cache = (row as Record<string, string> & { __idx?: Record<string, string> }).__idx;
  let idx: Record<string, string>;
  if (cache) {
    idx = cache;
  } else {
    idx = {};
    for (const k of Object.keys(row)) {
      if (k === "__idx") continue;
      idx[normalizeHeader(k)] = k;
    }
    (row as Record<string, string> & { __idx?: Record<string, string> }).__idx = idx;
  }
  for (const c of candidates) {
    const realKey = idx[normalizeHeader(c)];
    if (realKey != null) return row[realKey] ?? "";
  }
  return "";
}

function parseCsv(buf: Buffer): Array<Record<string, string>> {
  // Tratamos de leer UTF-8 (con BOM) primero; si vemos caracteres de reemplazo,
  // re-decodificamos como latin1 (Windows-1252). Cubre tanto exports de Google
  // Sheets/Excel modernos como exports legacy de SAP.
  let text = new TextDecoder("utf-8").decode(buf).replace(/^﻿/, "").replace(/\r\n/g, "\n").trim();
  if (text.includes("�")) {
    text = new TextDecoder("latin1").decode(buf).replace(/\r\n/g, "\n").trim();
  }
  const firstLine = text.split("\n")[0] ?? "";
  // Autodetect delimiter: priorizamos ; (lo más común en SAP/locale es-AR),
  // después tab, después coma.
  const delim = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";
  // Usamos PapaParse para respetar comillas dobles (ej. campos con coma
  // decimal: "10,19%") y evitar el bug de un split() naive que rompe
  // filas con campos quoted.
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    delimiter: delim,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  return parsed.data.map((r) => {
    const out: Record<string, string> = {};
    for (const k of Object.keys(r)) out[k] = (r[k] ?? "").toString().trim();
    return out;
  });
}

async function resolveCBFolderId(): Promise<string> {
  const override = process.env.DRIVE_CB_FOLDER_ID;
  if (override) return override;
  const parent = process.env.DRIVE_FOLDER_ID;
  if (!parent) throw new Error("Falta DRIVE_FOLDER_ID (y DRIVE_CB_FOLDER_ID).");
  const sub = await findSubfolderId(parent, CB_SUBFOLDER_NAME).catch(() => null);
  return sub ?? parent;
}

async function pickLatest(
  folderId: string,
  pattern: RegExp,
): Promise<{ id: string; name: string } | null> {
  const files = await listFolderFiles(folderId);
  const matching = files.filter((f) => pattern.test(f.name) && /\.csv$/i.test(f.name));
  if (matching.length === 0) return null;
  matching.sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime));
  return { id: matching[0].id, name: matching[0].name };
}

// ----- Cache -----

type CBSnapshot = {
  cuadroBasico: CuadroBasicoItem[];
  clasificacion: ClasificacionCliente[];
  cbFile: string;
  clasifFile: string;
  builtAt: number;
};

let cache: CBSnapshot | null = null;
let inflight: Promise<CBSnapshot> | null = null;

export function invalidateCBDriveCache() {
  cache = null;
  inflight = null;
}

async function build(): Promise<CBSnapshot> {
  const folderId = await resolveCBFolderId();
  const [cbFile, clasifFile] = await Promise.all([
    pickLatest(folderId, CB_FILENAME_PATTERN),
    pickLatest(folderId, CLASIF_FILENAME_PATTERN),
  ]);
  if (!cbFile) throw new Error("No encontré ningún CSV que matchee Cuadros-basicos*.csv en Drive");
  if (!clasifFile) throw new Error("No encontré ningún CSV que matchee Clasificacion-clientes*.csv en Drive");

  const [cbBuf, clasifBuf] = await Promise.all([
    downloadFile(cbFile.id),
    downloadFile(clasifFile.id),
  ]);

  // ----- Clasificación -----
  // Uso pick() para tolerar variantes case/acentos/espacios/guiones en los
  // headers (ej. "TIPOLOGIA" vs "Tipología" vs "tipologia").
  const clasifRows = parseCsv(clasifBuf);
  const clasificacion: ClasificacionCliente[] = [];
  for (const r of clasifRows) {
    const tip = normTipologia(pick(r, "TIPOLOGIA"));
    if (!tip) continue;
    clasificacion.push({
      id: pick(r, "ID"),
      cliente: pick(r, "CLIENTE"),
      pesoFacturacion: parsePeso(pick(r, "PESO FACTURACION", "PESO FACTURACIÓN")),
      tipologia: tip,
      vendedor: pick(r, "VENDEDOR"),
      gerente: pick(r, "GERENCIA", "GERENTE"),
    });
  }

  // ----- Cuadro básico -----
  // Las filas con CLIENTE explícito (TOP 10) se persisten tal cual; las que
  // vienen sin cliente se expanden a todos los clientes de la tipología
  // (vía clasificación). Mismo algoritmo que scripts/import-csv.mjs.
  const clientesPorTipologia = new Map<Tipologia, string[]>();
  for (const c of clasificacion) {
    const arr = clientesPorTipologia.get(c.tipologia) ?? [];
    arr.push(c.cliente);
    clientesPorTipologia.set(c.tipologia, arr);
  }

  const cbRows = parseCsv(cbBuf);
  const cuadroBasico: CuadroBasicoItem[] = [];
  for (const r of cbRows) {
    const tipologia = normTipologia(pick(r, "TIPOLOGIA"));
    if (!tipologia) continue;
    const cb = pick(r, "CUADRO BASICO", "CUADRO BÁSICO").trim().toUpperCase();
    if (cb !== "INFALTABLE" && cb !== "ESTRATEGICO") continue;
    const categoria = pick(r, "CATEGORIA", "CATEGORÍA").trim().toUpperCase();
    if (!["LAVADO", "REFRIGERACION", "COCCION"].includes(categoria)) continue;
    const sku = pick(r, "MODELO", "SKU", "MATERIAL").trim();
    if (!sku) continue;
    // SKUs homólogos: cualquier columna cuyo header arranca con "HOMOLOGO"
    // (HOMOLOGO 1, HOMOLOGO 2, ..., también "HOMÓLOGO" con tilde). Dedupeamos
    // y excluimos el primary para evitar contar de más en el matching.
    const seen = new Set<string>([sku]);
    const skuAliases: string[] = [];
    for (const key of Object.keys(r)) {
      const nk = normalizeHeader(key);
      if (!nk.startsWith("homologo")) continue;
      const v = (r[key] ?? "").trim();
      if (!v || seen.has(v)) continue;
      seen.add(v);
      skuAliases.push(v);
    }
    const clienteExplicito = pick(r, "CLIENTE").trim();
    const tipo: TipoCB = cb === "INFALTABLE" ? "INFALTABLE" : "ESTRATEGICO";
    const cat: Categoria =
      categoria === "LAVADO" ? "LAVADO" : categoria === "REFRIGERACION" ? "REFRIGERACION" : "COCCION";

    if (clienteExplicito) {
      cuadroBasico.push({ tipologia, cliente: clienteExplicito, tipo, categoria: cat, sku, skuAliases });
    } else {
      const clientes = clientesPorTipologia.get(tipologia) ?? [];
      for (const cli of clientes) {
        cuadroBasico.push({ tipologia, cliente: cli, tipo, categoria: cat, sku, skuAliases });
      }
    }
  }

  return {
    cuadroBasico,
    clasificacion,
    cbFile: cbFile.name,
    clasifFile: clasifFile.name,
    builtAt: Date.now(),
  };
}

export async function loadCBSnapshotFromDrive(): Promise<CBSnapshot> {
  if (cache && Date.now() - cache.builtAt < CACHE_TTL_MS) {
    return cache;
  }
  if (inflight) return inflight;
  inflight = build()
    .then((snap) => {
      cache = snap;
      return snap;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function loadCuadroBasicoFromDrive(): Promise<CuadroBasicoItem[]> {
  return (await loadCBSnapshotFromDrive()).cuadroBasico;
}

export async function loadClasificacionFromDrive(): Promise<ClasificacionCliente[]> {
  return (await loadCBSnapshotFromDrive()).clasificacion;
}
