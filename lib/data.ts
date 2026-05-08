import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  CuadroBasicoItem,
  ClasificacionCliente,
  VentasFile,
} from "./types";
import { readVentas } from "./storage";

const DATA_DIR = path.join(process.cwd(), "public", "data");

async function readJson<T>(file: string): Promise<T> {
  const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
  return JSON.parse(raw) as T;
}

export async function loadCuadroBasico(): Promise<CuadroBasicoItem[]> {
  return readJson<CuadroBasicoItem[]>("cuadro-basico.json");
}

export async function loadClasificacion(): Promise<ClasificacionCliente[]> {
  return readJson<ClasificacionCliente[]>("clasificacion-clientes.json");
}

export async function loadVentas(): Promise<VentasFile> {
  return readVentas();
}
