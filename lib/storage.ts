import { promises as fs } from "node:fs";
import path from "node:path";
import { put, list } from "@vercel/blob";
import type { VentasFile } from "./types";

// Estrategia:
//   - Si BLOB_READ_WRITE_TOKEN está seteado → Vercel Blob (prod en Vercel).
//     El blob se guarda con pathname fijo "ventas.json" (allowOverwrite).
//   - Si no → filesystem local en /public/data/ventas.json (dev).
//
// El dashboard llama a `loadVentas()` en cada request; en prod la latencia
// extra es despreciable porque el blob se cachea en CDN.

const VENTAS_BLOB_PATH = "ventas.json";

const localVentasPath = () =>
  path.join(process.cwd(), "public", "data", "ventas.json");

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

async function readJsonLocal<T>(file: string): Promise<T> {
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw) as T;
}

export async function readVentas(): Promise<VentasFile> {
  if (useBlob()) {
    const { blobs } = await list({ prefix: VENTAS_BLOB_PATH, limit: 1 });
    const blob = blobs.find((b) => b.pathname === VENTAS_BLOB_PATH);
    if (blob) {
      const res = await fetch(blob.url, { cache: "no-store" });
      if (!res.ok) throw new Error(`No pude leer ventas.json del Blob (${res.status})`);
      return (await res.json()) as VentasFile;
    }
    // Si no hay blob todavía, caemos al archivo dummy del repo para no
    // romper la primera carga después de un deploy en frío.
  }
  return readJsonLocal<VentasFile>(localVentasPath());
}

export async function writeVentas(file: VentasFile): Promise<{ url: string | null }> {
  const body = JSON.stringify(file);
  if (useBlob()) {
    const blob = await put(VENTAS_BLOB_PATH, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return { url: blob.url };
  }
  await fs.writeFile(localVentasPath(), body);
  return { url: null };
}
