import { promises as fs } from "node:fs";
import path from "node:path";
import { put, get } from "@vercel/blob";
import type { VentasFile } from "./types";

// Estrategia:
//   - Si BLOB_READ_WRITE_TOKEN está seteado → Vercel Blob (prod en Vercel).
//     Store privado, blob con pathname fijo "ventas.json" (allowOverwrite).
//   - Si no → filesystem local en /public/data/ventas.json (dev).
//
// El dashboard llama a `loadVentas()` en cada request; en prod la latencia
// extra es despreciable porque get() reutiliza el cache del SDK.

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
    try {
      const result = await get(VENTAS_BLOB_PATH, { access: "private", useCache: false });
      if (result && result.statusCode === 200 && result.stream) {
        const text = await new Response(result.stream).text();
        return JSON.parse(text) as VentasFile;
      }
    } catch (err) {
      // Si todavía no existe el blob (primer arranque después del deploy),
      // caemos al archivo dummy del repo para no romper la home.
      const message = err instanceof Error ? err.message : String(err);
      if (!/not.*found|404/i.test(message)) throw err;
    }
  }
  return readJsonLocal<VentasFile>(localVentasPath());
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
  await fs.writeFile(localVentasPath(), body);
  return { url: null };
}
