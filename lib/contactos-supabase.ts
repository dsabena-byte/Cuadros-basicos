import { supabaseSelectAll } from "./supabase";
import {
  canonicalizePromotorNames,
  canonicalizeSupervisor,
  norm,
  normalizeStoreNumber,
  type ContactoRow,
} from "./parse";

type ContactoDB = {
  numero_tienda: string;
  nombre_tienda: string;
  cadena: string | null;
  promotor: string | null;
  supervisor: string | null;
  email_promotor: string | null;
};

// Carga la tabla `contactos` de Supabase y devuelve el Map con la misma
// shape que produce parseContactosCsv() — para que el resto del pipeline
// pueda usarlo sin distinguir el origen.
export async function loadContactosFromSupabase(): Promise<Map<string, ContactoRow>> {
  const rows = await supabaseSelectAll<ContactoDB>("contactos", {
    select: "numero_tienda,nombre_tienda,cadena,promotor,supervisor,email_promotor",
  });
  const map = new Map<string, ContactoRow>();
  for (const r of rows) {
    const numero = normalizeStoreNumber(r.numero_tienda);
    const nombre = (r.nombre_tienda ?? "").trim();
    if (!numero || !nombre) continue;
    const nombreNorm = norm(nombre);
    const key = numero + "|" + nombreNorm;
    map.set(key, {
      numero,
      nombreNorm,
      cadena: (r.cadena ?? "").trim(),
      promotor: (r.promotor ?? "").trim(),
      supervisor: canonicalizeSupervisor((r.supervisor ?? "").trim()),
      emailPromotor: (r.email_promotor ?? "").trim(),
    });
  }
  canonicalizePromotorNames(map);
  return map;
}
