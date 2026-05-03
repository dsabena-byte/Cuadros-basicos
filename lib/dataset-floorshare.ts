import { downloadFile, findSubfolderId, listFolderFiles } from "./drive";
import {
  parseFloorShareCsv,
  parseFloorShareFilename,
  type FloorShareRow,
} from "./parse-floorshare";
import type { ContactoRow } from "./parse";
import { norm, tiendaKeyFromHMPDV } from "./parse";

const SUBFOLDER_NAME = "floor-share";

export type FloorShareDataset = {
  rows: FloorShareEnrichedRow[];
  months: string[];          // sorted YYYY-MM
  categories: string[];      // sorted unique category codes
  brands: string[];          // sorted unique brand names (excluding Total)
  generatedAt: string;
  fileCount: number;
};

export type FloorShareEnrichedRow = FloorShareRow & {
  cliente: string;
  promotor: string;
  supervisor: string;
};

function isCsv(name: string): boolean {
  return /\.csv$/i.test(name);
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
  }
  return undefined;
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
  const cadenasByFirstWord = buildCadenasByFirstWord(contactos);

  const allRows: FloorShareEnrichedRow[] = [];
  let parsedCount = 0;

  await Promise.all(
    csvFiles.map(async (file) => {
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
        const contacto = lookupContacto(contactos, r.storeNumber, r.storeName);
        allRows.push({
          ...r,
          cliente:
            contacto?.cadena ||
            inferClienteFromName(r.storeName, cadenasByFirstWord),
          promotor: contacto?.promotor || "Sin asignar",
          supervisor: contacto?.supervisor || "Sin asignar",
        });
      }
    }),
  );

  const months = [...new Set(allRows.map((r) => r.month))].sort();
  const categories = [...new Set(allRows.map((r) => r.category))].sort();
  const brands = [
    ...new Set(allRows.map((r) => r.brand).filter((b) => b && b.toLowerCase() !== "total")),
  ].sort();

  return {
    rows: allRows,
    months,
    categories,
    brands,
    generatedAt: new Date().toISOString(),
    fileCount: parsedCount,
  };
}
