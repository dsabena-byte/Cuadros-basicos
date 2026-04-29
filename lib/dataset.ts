import { downloadFile, listFolderFiles } from "./drive";
import {
  parseContactosCsv,
  parseDataCsv,
  parseSemanaFromFilename,
  type DataRow,
} from "./parse";

export type Dataset = {
  rows: DataRow[];
  semanas: number[];
  generatedAt: string;
  fileCount: number;
};

const CONTACTOS_NAME_PATTERNS = [
  /tiendas.*promotor.*supervisor/i,
  /promotor.*supervisor/i,
  /contactos/i,
  /maestro.*tiend/i,
];

function isCsv(name: string): boolean {
  return /\.csv$/i.test(name);
}

function isContactos(name: string): boolean {
  return CONTACTOS_NAME_PATTERNS.some((re) => re.test(name));
}

export async function buildDataset(folderId: string): Promise<Dataset> {
  const files = await listFolderFiles(folderId);
  const csvFiles = files.filter((f) => isCsv(f.name));

  const contactosFile = csvFiles.find((f) => isContactos(f.name));
  let contactos = new Map();
  if (contactosFile) {
    const buf = await downloadFile(contactosFile.id);
    contactos = parseContactosCsv(buf);
  }

  const dataFiles = csvFiles.filter((f) => f !== contactosFile);

  const bySemana = new Map<number, DataRow[]>();
  await Promise.all(
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

  const allRows: DataRow[] = [];
  for (const rows of bySemana.values()) allRows.push(...rows);

  const semanas = [...bySemana.keys()].sort((a, b) => a - b);

  return {
    rows: allRows,
    semanas,
    generatedAt: new Date().toISOString(),
    fileCount: dataFiles.length,
  };
}
