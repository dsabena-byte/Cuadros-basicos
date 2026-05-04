import Papa from "papaparse";
import { normalizeStoreNumber } from "./parse";

export type FloorShareRow = {
  month: string;          // YYYY-MM
  monthLabel: string;     // "Octubre 2025"
  category: string;       // "coccion"
  storeNumber: string;    // "124"
  storeName: string;      // "Frávega Once Ciudad (Casa Central)"
  brand: string;          // "Drean"
  units: number;          // 12
  pctRaw: number | null;  // 0.052... — raw % from file (ignored for calcs)
};

const MES_NOMBRES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function monthLabelFromCode(code: string): string {
  const m = code.match(/^(\d{4})-(\d{2})$/);
  if (!m) return code;
  const year = m[1];
  const month = parseInt(m[2], 10);
  if (month < 1 || month > 12) return code;
  return `${MES_NOMBRES[month - 1]} ${year}`;
}

export function parseFloorShareFilename(
  name: string,
): { month: string; category: string } | null {
  // Convención: "YYYY-MM_CATEGORIA.csv". Tolerante a:
  // - espacios extras alrededor del separador o antes de .csv
  // - mayúsculas/minúsculas en la extensión
  // - underscores extra en la categoría (se colapsan a espacios)
  const base = name.replace(/\s*\.csv\s*$/i, "");
  const m = base.match(/^\s*(\d{4})\s*-\s*(\d{2})\s*_\s*(.+?)\s*$/);
  if (!m) return null;
  const monthNum = parseInt(m[2], 10);
  if (monthNum < 1 || monthNum > 12) return null;
  const month = `${m[1]}-${m[2]}`;
  const category = m[3]
    .replace(/_+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!category) return null;
  return { month, category };
}

function decodeCsvBuffer(buffer: Buffer): string {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xef &&
    buffer[1] === 0xbb &&
    buffer[2] === 0xbf
  ) {
    return buffer.toString("utf8").slice(1);
  }
  const utf8 = buffer.toString("utf8");
  if (utf8.includes("�")) {
    return new TextDecoder("windows-1252").decode(buffer);
  }
  if (
    utf8.includes("Ã©") ||
    utf8.includes("Ã³") ||
    utf8.includes("Ã±") ||
    utf8.includes("Ã¡") ||
    utf8.includes("Ãº") ||
    utf8.includes("Ã­")
  ) {
    return new TextDecoder("windows-1252").decode(buffer);
  }
  return utf8;
}

function detectDelimiter(firstLine: string): string {
  if (firstLine.includes(";")) return ";";
  if (firstLine.includes("\t")) return "\t";
  return ",";
}

function parseLocaleNumber(raw: string | undefined | null): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Argentine format: "1.234,56" → "1234.56"
  // If both . and , present, dot is thousands sep, comma is decimal
  let cleaned = s.replace(/\s/g, "").replace(/%/g, "");
  if (cleaned.includes(".") && cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function splitStoreCell(cell: string): { number: string; name: string } | null {
  const trimmed = cell.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (upper === "TOTAL" || upper.startsWith("TOTAL ") || upper === "SUBTOTAL") {
    return null;
  }
  const m = trimmed.match(/^(\d+)\s*[-–]\s*(.+)$/);
  if (m) return { number: normalizeStoreNumber(m[1]), name: m[2].trim() };
  // Fallback: leading number + space + name
  const m2 = trimmed.match(/^(\d+)\s+(.+)$/);
  if (m2) return { number: normalizeStoreNumber(m2[1]), name: m2[2].trim() };
  // No number → emit empty number, full string as name
  return { number: "", name: trimmed };
}

export function parseFloorShareCsv(
  buffer: Buffer,
  meta: { month: string; category: string },
): FloorShareRow[] {
  const text = decodeCsvBuffer(buffer).replace(/^﻿/, "");
  const firstLine = text.split("\n")[0] ?? "";
  const delim = detectDelimiter(firstLine);
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    delimiter: delim,
    skipEmptyLines: "greedy",
  });
  const grid = parsed.data.filter((r) => Array.isArray(r));
  if (grid.length < 3) return [];

  const headerRow1 = grid[0].map((c) => (c ?? "").toString().trim());
  // headerRow2 ignored except as confirmation (every odd col should be "%Part" or similar)

  // Brand columns come in pairs starting at col 1: [units, pct] per brand
  // headerRow1[0] is the "Subcategoría Participación Anaquel" label
  // headerRow1[1] = brand A, headerRow1[2] = brand A (or empty/repeated)
  // We treat col 1, 3, 5, ... as brand-name anchors
  const brandPairs: { brand: string; unitsCol: number; pctCol: number }[] = [];
  for (let col = 1; col < headerRow1.length; col += 2) {
    const brand = headerRow1[col] || headerRow1[col + 1] || "";
    if (!brand) continue;
    brandPairs.push({ brand: brand.trim(), unitsCol: col, pctCol: col + 1 });
  }

  const rows: FloorShareRow[] = [];
  const monthLabel = monthLabelFromCode(meta.month);

  for (let i = 2; i < grid.length; i++) {
    const r = grid[i];
    if (!r || r.length === 0) continue;
    const storeCell = (r[0] ?? "").toString();
    const store = splitStoreCell(storeCell);
    if (!store || !store.name) continue;

    for (const pair of brandPairs) {
      const unitsRaw = r[pair.unitsCol];
      const pctRaw = r[pair.pctCol];
      const units = parseLocaleNumber(unitsRaw) ?? 0;
      const pct = parseLocaleNumber(pctRaw);
      if (units <= 0) continue;
      rows.push({
        month: meta.month,
        monthLabel,
        category: meta.category,
        storeNumber: store.number,
        storeName: store.name,
        brand: pair.brand,
        units,
        pctRaw: pct,
      });
    }
  }

  return rows;
}
