import { promises as fs } from "node:fs";
import path from "node:path";
import { put, get } from "@vercel/blob";
import type { VentasFile } from "./types";
import dummyVentas from "@/data/ventas.json";

// Estrategia:
//   - Si BLOB_READ_WRITE_TOKEN está seteado (Vercel) → blob privado.
//     Si el blob aún no existe (deploy en frío, antes del primer POST de
//     Power Automate) caemos al `ventas.json` bundleado del repo.
//   - Si no → filesystem local en /data/ventas.json (dev).

const VENTAS_BLOB_PATH = "ventas.json";

const localVentasPath = () =>
  path.join(process.cwd(), "data", "ventas.json");

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function readVentas(): Promise<VentasFile> {
  if (useBlob()) {
    try {
      const result = await get(VENTAS_BLOB_PATH, { access: "private", useCache: false });
      if (result && result.statusCode === 200 && result.stream) {
        const text = await new Response(result.stream).text();
        return JSON.parse(text) as VentasFile;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/not.*found|404/i.test(message)) throw err;
    }
    return dummyVentas as VentasFile;
  }

  // Dev local — leer del FS para que se actualice cuando POST /api/ventas
  // escribe.
  try {
    const raw = await fs.readFile(localVentasPath(), "utf8");
    return JSON.parse(raw) as VentasFile;
  } catch {
    return dummyVentas as VentasFile;
  }
}

export async function writeVentas(file: VentasFile): Promise<{ url: string | null }> {
  const body = JSON.stringify(file);
  if (useBlob()) {
    const blob = await put(VENTAS_BLOB_PATH, body, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    return { url: blob.url };
  }
  await fs.mkdir(path.dirname(localVentasPath()), { recursive: true });
  await fs.writeFile(localVentasPath(), body);
  return { url: null };
}
