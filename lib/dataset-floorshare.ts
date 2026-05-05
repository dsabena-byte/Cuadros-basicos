import { downloadFile, findSubfolderId, listFolderFiles } from "./drive";
import {
  parseFloorShareCsv,
  parseFloorShareFilename,
  type FloorShareRow,
} from "./parse-floorshare";
import type { ContactoRow } from "./parse";
import {
  canonicalizePromotorNames,
  isContactosFilename,
  norm,
  normalizeStoreNumber,
  parseContactosCsv,
  tiendaKeyFromHMPDV,
} from "./parse";

const SUBFOLDER_NAME = "floor-share";

export type FloorShareDataset = {
  rows: FloorShareEnrichedRow[];
  months: string[];          // sorted YYYY-MM
  categories: string[];      // sorted unique category codes
  brands: string[];          // sorted unique brand names (excluding Total)
  generatedAt: string;
  fileCount: number;
  contactosDebug?: {
    localFile: string | null;
    localCount: number;
    globalCount: number;
    mergedCount: number;
    unmatchedSample: { storeNumber: string; storeName: string }[];
    matchRate: number;
  };
  diagnostic?: {
    totalStores: number;
    unmappedCount: number;
    noPromotorCount: number;
    unmapped: { storeNumber: string; storeName: string; cliente: string }[];
    noPromotor: {
      storeNumber: string;
      storeName: string;
      cliente: string;
      supervisor: string;
    }[];
  };
};

export const PROMOTOR_NO_MAPEO = "Tienda sin mapeo";
export const PROMOTOR_SIN = "Sin promotor";
export const SUPERVISOR_NO_MAPEO = "Tienda sin mapeo";
export const SUPERVISOR_SIN = "Sin supervisor";

export type FloorShareEnrichedRow = FloorShareRow & {
  cliente: string;
  promotor: string;
  supervisor: string;
};

function isCsv(name: string): boolean {
  return /\.csv$/i.test(name);
}

// Asignaciones manuales para tiendas que no figuraban en el mapeo del CSV
// de contactos. Se mergean después del merge de global+local. El supervisor
// se infiere del primer contacto existente con ese mismo promotor.
const MANUAL_CONTACTOS: Array<{
  numero: string;
  nombre: string;
  cadena: string;
  promotor: string;
}> = [
  { numero: "182", nombre: "Hiper Libertad",                       cadena: "Hiper Libertad",    promotor: "Pagano Antonella" },
  { numero: "183", nombre: "Hiper Libertad",                       cadena: "Hiper Libertad",    promotor: "Cavalie Gaston" },
  { numero: "185", nombre: "Hiper Libertad Córdoba Av. Sabattini", cadena: "Hiper Libertad",    promotor: "Cavalie Gaston" },
  { numero: "231", nombre: "Hiper Libertad",                       cadena: "Hiper Libertad",    promotor: "Soria Carolina" },
  { numero: "232", nombre: "Hiper Libertad",                       cadena: "Hiper Libertad",    promotor: "Soria Carolina" },
  { numero: "806", nombre: "On City Casilda",                      cadena: "On City",           promotor: "Scoppa Victor" },
  { numero: "866", nombre: "On City Río Cuarto Shopping",          cadena: "On City",           promotor: "Amaya Heliana" },
  { numero: "879", nombre: "On City Villa Cabrera",                cadena: "On City",           promotor: "Pagano Antonella" },
  { numero: "883", nombre: "On City Liniers",                      cadena: "On City",           promotor: "Rozhenal Axel" },
  { numero: "884", nombre: "On City Dot Baires",                   cadena: "On City",           promotor: "Paez Esteban" },
  { numero: "70",  nombre: "Giudice La Plata Centro",              cadena: "Giudice",           promotor: "Perez Martina" },
  { numero: "152", nombre: "Vea Tucumán Terminal",                 cadena: "Vea",               promotor: "Soria Carolina" },
  { numero: "251", nombre: "Tevelin Yerba Buena",                  cadena: "Tevelín",           promotor: "Soria Carolina" },
  { numero: "323", nombre: "Aloise Abasto",                        cadena: "Aloise Y Cia Sa",   promotor: "Paez Esteban" },
  { numero: "377", nombre: "Jumbo Palermo",                        cadena: "Jumbo",             promotor: "Paez Esteban" },
  { numero: "465", nombre: "Casa Del Audio Ramos Mejía",           cadena: "La Casa Del Audio", promotor: "Rodriguez Diana" },
  { numero: "528", nombre: "Casa Dricco",                          cadena: "Casa Maitess",      promotor: "Scoppa Victor" },
  { numero: "552", nombre: "Italhogar",                            cadena: "Italhogar",         promotor: "Scoppa Victor" },
];

function applyManualContactos(map: Map<string, ContactoRow>): void {
  const promotorToSupervisor = new Map<string, string>();
  for (const v of map.values()) {
    const p = (v.promotor || "").trim();
    const s = (v.supervisor || "").trim();
    if (p && s && !promotorToSupervisor.has(p)) promotorToSupervisor.set(p, s);
  }
  let added = 0;
  let skipped = 0;
  for (const m of MANUAL_CONTACTOS) {
    const numeroKey = normalizeStoreNumber(m.numero);
    if (!numeroKey) continue;
    const key = numeroKey + "|" + norm(m.nombre);
    if (map.has(key)) {
      skipped++;
      continue;
    }
    map.set(key, {
      numero: numeroKey,
      nombreNorm: norm(m.nombre),
      cadena: m.cadena,
      promotor: m.promotor,
      supervisor: promotorToSupervisor.get(m.promotor) || "",
      emailPromotor: "",
    });
    added++;
  }
  console.log(
    `[floor-share] applyManualContactos: ${added} agregadas, ${skipped} ya existían (de ${MANUAL_CONTACTOS.length} totales)`,
  );
}

// Unifica variantes de nombre de cliente al canónico. La key se compara
// normalizada (lowercase, sin acentos, sin puntos, espacios colapsados).
const CLIENTE_ALIASES_RAW: Record<string, string> = {
  "walmater": "Changomas",
  "chango": "Changomas",
  "changomas": "Changomas",
  "authogar": "Autohogar",
  "autohogar": "Autohogar",
  "casa": "La Casa Del Audio",
  "casa del audio": "La Casa Del Audio",
  "la casa del audio": "La Casa Del Audio",
  "fravega": "Frávega",
  "fravega sa": "Frávega",
  "fravega s a": "Frávega",
  "electronica": "On City",
  "on city": "On City",
  "radio sapienza": "Radio Sapienza",
  "radio sapienza sa": "Radio Sapienza",
  "saturno hogar": "Saturno Hogar",
  "saturno hogar sa": "Saturno Hogar",
  "tevelin": "Tevelín",
  "av": "Naldo Lombardi",
  "naldo": "Naldo Lombardi",
  "naldo lombardi": "Naldo Lombardi",
  "tio": "Tio Musa",
  "tio musa": "Tio Musa",
  "ama": "Ama Hogar",
  "ama hogar": "Ama Hogar",
  "cetrogar": "Cetrogar Sa",
  "cetrogar sa": "Cetrogar Sa",
  "castillojujuy": "Castillo",
  "mi": "Mi Casa",
  "mia": "Mi Casa",
  "mi casa": "Mi Casa",
  "walmart": "Changomas",
};

// Overrides puntuales para tiendas cuyo nombre no comienza con la cadena.
// El match requiere número + substring del nombre, porque el número solo
// no es único entre cadenas (la misma fila numérica aparece en distintos
// CSVs de Floor Share).
type StoreOverride = { number: string; nameContains: string; cliente: string };
const STORE_OVERRIDES: StoreOverride[] = [
  { number: "772", nameContains: "av. san martin", cliente: "Cetrogar Sa" },
];

function lookupStoreOverride(number: string, name: string): string | undefined {
  if (!number || !name) return undefined;
  const ln = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  for (const o of STORE_OVERRIDES) {
    if (o.number !== number) continue;
    if (!ln.includes(o.nameContains)) continue;
    return o.cliente;
  }
  return undefined;
}

// Tiendas a excluir del dataset. Match case-insensitive sin acentos contra
// substring del storeName.
const EXCLUDED_STORE_PATTERNS = [
  "m y a representaciones",
  "manuel y ricardo braude",
];

function isExcludedStore(storeName: string): boolean {
  if (!storeName) return false;
  const normalized = storeName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  return EXCLUDED_STORE_PATTERNS.some((p) => normalized.includes(p));
}

function canonicalizeKey(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeCliente(s: string): string {
  if (!s) return s;
  const key = canonicalizeKey(s);
  return CLIENTE_ALIASES_RAW[key] || s;
}

// Marcas multi-palabra que el matching por primera palabra fallaría.
// Se chequean primero (orden importa: la más larga primero).
const MULTI_WORD_BRANDS = [
  "La Casa Del Audio",
  "Casa Del Audio",
  "Radio Sapienza",
  "Oscar Barbieri",
  "Genesio Hogar",
  "Petenatti Hogar",
  "Saturno Hogar",
  "Rodo Hogar",
  "On City",
  "Tio Musa",
  "Ama Hogar",
  "Mi Casa",
];

function titleCaseWord(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function inferClienteFromName(
  storeName: string,
  cadenasByFirstWord: Map<string, string>,
): string {
  const trimmed = (storeName || "").trim();
  if (!trimmed) return "Sin asignar";
  const lower = trimmed.toLowerCase();

  for (const brand of MULTI_WORD_BRANDS) {
    const bl = brand.toLowerCase();
    if (lower === bl || lower.startsWith(bl + " ")) return brand;
  }

  const first = lower.split(/\s+/)[0] || "";
  if (!first) return "Sin asignar";
  const known = cadenasByFirstWord.get(first);
  if (known) return known;
  return titleCaseWord(first);
}

function buildCadenasByFirstWord(
  contactos: Map<string, ContactoRow>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of contactos.values()) {
    const cadena = (c.cadena || "").trim();
    if (!cadena) continue;
    const first = cadena.toLowerCase().split(/\s+/)[0];
    if (first && !map.has(first)) map.set(first, cadena);
  }
  return map;
}

function lookupContacto(
  contactos: Map<string, ContactoRow>,
  byName: Map<string, ContactoRow>,
  storeNumber: string,
  storeName: string,
): ContactoRow | undefined {
  if (storeNumber && storeName) {
    const fullKey = storeNumber + "|" + norm(storeName);
    const direct = contactos.get(fullKey);
    if (direct) return direct;
  }
  if (storeNumber) {
    for (const [key, value] of contactos) {
      if (key.startsWith(storeNumber + "|")) return value;
    }
  }
  if (storeName) {
    const fallbackKey = tiendaKeyFromHMPDV(storeName);
    const fb = contactos.get(fallbackKey);
    if (fb) return fb;
    // Fallback: por nombre normalizado solo (ignorando número)
    const normName = norm(storeName);
    const byNameHit = byName.get(normName);
    if (byNameHit) return byNameHit;
  }
  return undefined;
}

function buildContactosByName(
  contactos: Map<string, ContactoRow>,
): Map<string, ContactoRow> {
  const out = new Map<string, ContactoRow>();
  for (const c of contactos.values()) {
    if (c.nombreNorm && !out.has(c.nombreNorm)) out.set(c.nombreNorm, c);
  }
  return out;
}

export async function buildFloorShareDataset(
  parentFolderId: string,
  contactos: Map<string, ContactoRow>,
): Promise<FloorShareDataset | null> {
  let subfolderId: string | null = null;
  try {
    subfolderId = await findSubfolderId(parentFolderId, SUBFOLDER_NAME);
  } catch (err) {
    console.error("[floor-share] error buscando subcarpeta:", err);
    return null;
  }
  if (!subfolderId) return null;

  let files;
  try {
    files = await listFolderFiles(subfolderId);
  } catch (err) {
    console.error("[floor-share] error listando archivos:", err);
    return null;
  }
  const csvFiles = files.filter((f) => isCsv(f.name));

  // Si hay un CSV de contactos en la subcarpeta floor-share/, lo parseamos y
  // mergeamos con el mapa global. Las entradas locales sobrescriben a las
  // globales (mismo key = numero+nombre).
  const localContactosFile = csvFiles.find((f) => isContactosFilename(f.name));
  let mergedContactos = contactos;
  let localCount = 0;
  if (localContactosFile) {
    try {
      const buf = await downloadFile(localContactosFile.id);
      const localContactos = parseContactosCsv(buf);
      localCount = localContactos.size;
      mergedContactos = new Map(contactos);
      for (const [k, v] of localContactos) mergedContactos.set(k, v);
      console.log(
        `[floor-share] contactos locales: ${localContactosFile.name} → ${localCount} filas (global: ${contactos.size}, merged: ${mergedContactos.size})`,
      );
    } catch (err) {
      console.error(
        `[floor-share] no pude leer contactos local ${localContactosFile.name}:`,
        err,
      );
    }
  }
  const dataFiles = csvFiles.filter((f) => f !== localContactosFile);
  // Re-unifica nombres de promotor sobre el mapa mergeado (global+local).
  canonicalizePromotorNames(mergedContactos);
  // Suma asignaciones manuales para tiendas que no estaban en el CSV.
  applyManualContactos(mergedContactos);
  const cadenasByFirstWord = buildCadenasByFirstWord(mergedContactos);
  const contactosByName = buildContactosByName(mergedContactos);

  const allRows: FloorShareEnrichedRow[] = [];
  let parsedCount = 0;
  // Tracking de matching contactos
  const seenStoreKeys = new Set<string>();
  const matchedStoreKeys = new Set<string>();
  const unmatchedSamples: { storeNumber: string; storeName: string }[] = [];
  // Diagnóstico completo (sin tope) para reporte en UI
  const unmappedStores: { storeNumber: string; storeName: string; cliente: string }[] = [];
  const noPromotorStores: {
    storeNumber: string;
    storeName: string;
    cliente: string;
    supervisor: string;
  }[] = [];

  await Promise.all(
    dataFiles.map(async (file) => {
      const meta = parseFloorShareFilename(file.name);
      if (!meta) {
        console.warn(`[floor-share] nombre no reconocido: ${file.name}`);
        return;
      }
      let buf: Buffer;
      try {
        buf = await downloadFile(file.id);
      } catch (err) {
        console.error(`[floor-share] no se pudo descargar ${file.name}:`, err);
        return;
      }
      let rows;
      try {
        rows = parseFloorShareCsv(buf, meta);
      } catch (err) {
        console.error(`[floor-share] error parseando ${file.name}:`, err);
        return;
      }
      parsedCount++;
      for (const r of rows) {
        if (isExcludedStore(r.storeName)) continue;
        // Cliente: prioridad override → inferencia desde el nombre.
        // No usamos contactos.cadena porque el lookup por número solo es
        // ambiguo (varias cadenas comparten número de tienda).
        const overridden = lookupStoreOverride(r.storeNumber, r.storeName);
        const rawCliente =
          overridden || inferClienteFromName(r.storeName, cadenasByFirstWord);
        // Promotor / supervisor sí los tomamos de contactos cuando hay match.
        const contacto = lookupContacto(
          mergedContactos,
          contactosByName,
          r.storeNumber,
          r.storeName,
        );
        const cliente = canonicalizeCliente(rawCliente);
        const promotorRaw = (contacto?.promotor || "").trim();
        const supervisorRaw = (contacto?.supervisor || "").trim();
        const promotorLabel = !contacto
          ? PROMOTOR_NO_MAPEO
          : promotorRaw || PROMOTOR_SIN;
        const supervisorLabel = !contacto
          ? SUPERVISOR_NO_MAPEO
          : supervisorRaw || SUPERVISOR_SIN;
        // Tracking de matching
        const storeKey = (r.storeNumber || "") + "|" + (r.storeName || "");
        if (!seenStoreKeys.has(storeKey)) {
          seenStoreKeys.add(storeKey);
          if (contacto) {
            matchedStoreKeys.add(storeKey);
            if (!promotorRaw) {
              noPromotorStores.push({
                storeNumber: r.storeNumber,
                storeName: r.storeName,
                cliente,
                supervisor: supervisorRaw,
              });
            }
          } else {
            unmappedStores.push({
              storeNumber: r.storeNumber,
              storeName: r.storeName,
              cliente,
            });
            if (unmatchedSamples.length < 20) {
              unmatchedSamples.push({
                storeNumber: r.storeNumber,
                storeName: r.storeName,
              });
            }
          }
        }
        allRows.push({
          ...r,
          cliente,
          promotor: promotorLabel,
          supervisor: supervisorLabel,
        });
      }
    }),
  );

  const months = [...new Set(allRows.map((r) => r.month))].sort();
  const categories = [...new Set(allRows.map((r) => r.category))].sort();
  const brands = [
    ...new Set(allRows.map((r) => r.brand).filter((b) => b && b.toLowerCase() !== "total")),
  ].sort();

  const totalStores = seenStoreKeys.size;
  const matchedStores = matchedStoreKeys.size;
  const matchRate = totalStores > 0 ? matchedStores / totalStores : 0;
  console.log(
    `[floor-share] tiendas únicas: ${totalStores}, con contacto: ${matchedStores} (${(matchRate * 100).toFixed(1)}%), sin contacto: ${totalStores - matchedStores}`,
  );

  // Orden estable para el reporte de diagnóstico
  const sortStores = <T extends { storeNumber: string; storeName: string }>(arr: T[]) =>
    arr.sort((a, b) => {
      const na = parseInt(a.storeNumber, 10);
      const nb = parseInt(b.storeNumber, 10);
      if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
      return (a.storeName || "").localeCompare(b.storeName || "", "es", {
        sensitivity: "base",
      });
    });
  sortStores(unmappedStores);
  sortStores(noPromotorStores);

  return {
    rows: allRows,
    months,
    categories,
    brands,
    generatedAt: new Date().toISOString(),
    fileCount: parsedCount,
    contactosDebug: {
      localFile: localContactosFile?.name ?? null,
      localCount,
      globalCount: contactos.size,
      mergedCount: mergedContactos.size,
      unmatchedSample: unmatchedSamples,
      matchRate,
    },
    diagnostic: {
      totalStores,
      unmappedCount: unmappedStores.length,
      noPromotorCount: noPromotorStores.length,
      unmapped: unmappedStores,
      noPromotor: noPromotorStores,
    },
  };
}
