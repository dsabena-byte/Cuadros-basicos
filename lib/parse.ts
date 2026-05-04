import Papa from "papaparse";

export type DataRow = {
  semana: number;
  mes: string;
  sku: string;
  tienda: string;
  cliente: string;
  division: string;
  targetCB: number;
  realCB: number;
  targetInf: number;
  realInf: number;
  tipoSKU: "Infaltable" | "Estratégico";
  promotor: string;
  supervisor: string;
};

export type ContactoRow = {
  numero: string;
  nombreNorm: string;
  cadena: string;
  promotor: string;
  supervisor: string;
  emailPromotor: string;
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function semanaToMes(semana: number): string {
  if (Number.isNaN(semana)) return "?";
  const idx = Math.min(11, Math.floor((semana - 1) / 4.33));
  return MESES[idx];
}

export function norm(s: string | undefined | null): string {
  return (s ?? "")
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[ÁÀÄÂ]/g, "A")
    .replace(/[ÉÈËÊ]/g, "E")
    .replace(/[ÍÌÏÎ]/g, "I")
    .replace(/[ÓÒÖÔ]/g, "O")
    .replace(/[ÚÙÜÛ]/g, "U")
    .replace(/Ñ/g, "N")
    .replace(/[^\w ]/g, "")
    .replace(/\s+/g, " ");
}

export function tiendaKeyFromHMPDV(tienda: string): string {
  if (!tienda) return "";
  const m = tienda
    .toString()
    .trim()
    .match(/^(\d+)\s*[-–]\s*(.+)$/);
  if (!m) return norm(tienda);
  return m[1] + "|" + norm(m[2]);
}

function decodeCsvBuffer(buffer: Buffer): string {
  // 1) BOM UTF-8 explícito → UTF-8 garantizado
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.toString("utf8").slice(1);
  }

  const utf8 = buffer.toString("utf8");

  // 2) Si al decodificar como UTF-8 aparecen caracteres de reemplazo (U+FFFD),
  //    el archivo NO era UTF-8 válido → fallback a windows-1252
  if (utf8.includes("\uFFFD")) {
    return new TextDecoder("windows-1252").decode(buffer);
  }

  // 3) Mojibake clásico: el archivo era UTF-8 pero alguien lo guardó
  //    desde otra herramienta como Latin1, así que vemos "Ã©" en lugar de "é"
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

export function parseSemanaFromFilename(name: string): number | null {
  const m = name.match(/(\d{1,2})/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n < 1 || n > 53) return null;
  return n;
}

type RawRecord = Record<string, string>;

function pick(record: RawRecord, ...names: string[]): string {
  for (const name of names) {
    const target = name.toLowerCase();
    for (const key of Object.keys(record)) {
      if (key && key.trim().toLowerCase() === target) {
        return record[key] ?? "";
      }
    }
  }
  return "";
}

export const CONTACTOS_NAME_PATTERNS = [
  /tiendas?.*promotor.*supervisor/i,
  /promotor.*supervisor/i,
  /contactos/i,
  /maestro.*tiend/i,
];

export function isContactosFilename(name: string): boolean {
  return CONTACTOS_NAME_PATTERNS.some((re) => re.test(name));
}

export function parseContactosCsv(buffer: Buffer): Map<string, ContactoRow> {
  const text = decodeCsvBuffer(buffer).replace(/^﻿/, "");
  const firstLine = text.split("\n")[0] ?? "";
  const delim = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";
  const parsed = Papa.parse<RawRecord>(text, {
    header: true,
    delimiter: delim,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const map = new Map<string, ContactoRow>();
  for (const r of parsed.data) {
    const numero = pick(r, "N° TIENDA", "N TIENDA", "Nº TIENDA", "NUMERO", "NRO TIENDA", "ID TIENDA").trim();
    const nombre = pick(r, "TIENDA", "TIENDA HMPDV", "NOMBRE TIENDA").trim();
    const cadena = pick(r, "CADENA", "CLIENTE", "CLIENTE/CADENA").trim();
    const promotor = pick(r, "PROMOTOR").trim();
    const supervisor = pick(r, "SUPERVISOR").trim();
    const emailPromotor = pick(r, "EMAIL_PROMOTOR", "EMAIL PROMOTOR", "EMAIL").trim();
    if (!numero || !nombre) continue;
    const key = numero + "|" + norm(nombre);
    map.set(key, { numero, nombreNorm: norm(nombre), cadena, promotor, supervisor, emailPromotor });
  }
  return map;
}

function lookupContacto(
  contactos: Map<string, ContactoRow>,
  tienda: string,
): ContactoRow | undefined {
  const fullKey = tiendaKeyFromHMPDV(tienda);
  const direct = contactos.get(fullKey);
  if (direct) return direct;
  const numMatch = fullKey.split("|")[0];
  if (!numMatch) return undefined;
  for (const [key, value] of contactos) {
    if (key.startsWith(numMatch + "|")) return value;
  }
  return undefined;
}

export function parseDataCsv(
  buffer: Buffer,
  semana: number,
  contactos: Map<string, ContactoRow>,
): DataRow[] {
  const text = decodeCsvBuffer(buffer).replace(/^﻿/, "");
  const firstLine = text.split("\n")[0] ?? "";
  const delim = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";
  const parsed = Papa.parse<RawRecord>(text, {
    header: true,
    delimiter: delim,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });

  const mes = semanaToMes(semana);
  const rows: DataRow[] = [];

  for (const r of parsed.data) {
    const tienda = pick(r, "TIENDA HMPDV", "TIENDA").trim();
    const sku = pick(r, "SKU MABE", "SKU").trim();
    if (!tienda || !sku) continue;

    const tiendaUpper = tienda.toUpperCase();
    if (tiendaUpper === "TOTAL" || tiendaUpper.startsWith("TOTAL ") || tiendaUpper === "SUBTOTAL") {
      continue;
    }
    if (sku.toUpperCase() === "TOTAL") continue;

    const targetCB = parseInt(pick(r, "targetCB"), 10) || 0;
    let realCB = parseInt(pick(r, "realCB"), 10) || 0;
    const targetInf = parseInt(pick(r, "targetInf"), 10) || 0;
    let realInf = parseInt(pick(r, "realInf"), 10) || 0;
    if (targetCB === 0 && targetInf === 0) continue;

    realCB = Math.min(realCB, targetCB);
    realInf = Math.min(realInf, targetInf);
    const tipoSKU: DataRow["tipoSKU"] = targetCB - targetInf === 0 ? "Infaltable" : "Estratégico";

    const contacto = lookupContacto(contactos, tienda);

    rows.push({
      semana,
      mes,
      sku,
      tienda,
      cliente: pick(r, "CLIENTE/CADENA", "CLIENTE"),
      division: pick(r, "DIVISION"),
      targetCB,
      realCB,
      targetInf,
      realInf,
      tipoSKU,
      promotor: contacto?.promotor || "Sin asignar",
      supervisor: contacto?.supervisor || "Sin asignar",
    });
  }

  return rows;
}
