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
