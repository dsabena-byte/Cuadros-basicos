import cuadroBasicoJson from "@/data/cuadro-basico.json";
import clasificacionJson from "@/data/clasificacion-clientes.json";
import type {
  CuadroBasicoItem,
  ClasificacionCliente,
  VentasFile,
} from "./types";
import { readVentas } from "./storage";
import { loadCuadroBasicoFromDrive, loadClasificacionFromDrive } from "./cb-drive";

// CB y clasificación se leen de Drive dinámicamente (igual que el dashboard
// de Trade Marketing) — así cuando agregás un cliente nuevo o cambiás la
// tipología en los CSVs del Drive, el dashboard /ventas lo refleja sin
// necesidad de re-deploys ni re-ejecutar scripts.
//
// Los JSONs estáticos en data/ quedan como fallback para desarrollo local
// (cuando no hay credenciales de Drive configuradas) y para evitar romper
// el dashboard si Drive falla.

async function tryDrive<T>(
  fn: () => Promise<T>,
  fallback: T,
  label: string,
): Promise<T> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.DRIVE_FOLDER_ID) {
    return fallback;
  }
  try {
    return await fn();
  } catch (err) {
    console.error(`[data] ${label} falló cargando de Drive, uso fallback estático:`, err);
    return fallback;
  }
}

export async function loadCuadroBasico(): Promise<CuadroBasicoItem[]> {
  return tryDrive(
    loadCuadroBasicoFromDrive,
    cuadroBasicoJson as CuadroBasicoItem[],
    "loadCuadroBasico",
  );
}

export async function loadClasificacion(): Promise<ClasificacionCliente[]> {
  return tryDrive(
    loadClasificacionFromDrive,
    clasificacionJson as ClasificacionCliente[],
    "loadClasificacion",
  );
}

// Ventas es dinámico: lo escribe POST /api/ventas (Office Script desde
// Excel) en el Vercel Blob; en local lo escribe a /data/ventas.json en
// el FS.
export async function loadVentas(): Promise<VentasFile> {
  return readVentas();
}
