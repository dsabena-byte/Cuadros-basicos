import cuadroBasicoJson from "@/data/cuadro-basico.json";
import clasificacionJson from "@/data/clasificacion-clientes.json";
import type {
  CuadroBasicoItem,
  ClasificacionCliente,
  VentasFile,
} from "./types";
import { readVentas } from "./storage";

// Cuadro básico y clasificación son estáticos (vienen del CSV de Drive
// vía scripts/import-csv.mjs). Los importamos directo así Next los
// bundlea con la función serverless en Vercel.

export async function loadCuadroBasico(): Promise<CuadroBasicoItem[]> {
  return cuadroBasicoJson as CuadroBasicoItem[];
}

export async function loadClasificacion(): Promise<ClasificacionCliente[]> {
  return clasificacionJson as ClasificacionCliente[];
}

// Ventas es dinámico: lo escribe POST /api/ventas (Power Automate) en el
// Vercel Blob; en local lo escribe a /data/ventas.json en el FS.
export async function loadVentas(): Promise<VentasFile> {
  return readVentas();
}
