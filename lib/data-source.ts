import {
  getDataset as getDatasetFromDrive,
  invalidateDatasetCache as invalidateDriveCache,
} from "./dataset";
import {
  getDatasetFromSupabase,
  invalidateDatasetSupabaseCache,
} from "./dataset-supabase";
import type { Dataset } from "./dataset";

// Selector de fuente de datos para el dashboard CB / Floor Share.
//
// - `drive` (default): pipeline original que lee CSVs desde Drive en cada
//   request, con caché de 5min.
// - `supabase`: lee desde la base sincronizada por Apps Script.
//
// Se cambia con env var DATA_SOURCE. El default mantiene el comportamiento
// histórico para que no se rompa producción si se olvida configurar.
export type DataSource = "drive" | "supabase";

export function currentDataSource(): DataSource {
  const raw = (process.env.DATA_SOURCE ?? "").toLowerCase().trim();
  return raw === "supabase" ? "supabase" : "drive";
}

export async function getDataset(): Promise<Dataset> {
  if (currentDataSource() === "supabase") {
    return getDatasetFromSupabase();
  }
  const folderId = process.env.DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error("DRIVE_FOLDER_ID no está definido");
  }
  return getDatasetFromDrive(folderId);
}

export function invalidateDataSourceCache(): void {
  invalidateDriveCache();
  invalidateDatasetSupabaseCache();
}
