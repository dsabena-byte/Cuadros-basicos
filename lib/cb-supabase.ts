import { supabaseSelectAll } from "./supabase";
import {
  semanaToMes,
  tiendaKeyFromHMPDV,
  type ContactoRow,
  type DataRow,
} from "./parse";

type CBDB = {
  semana: number;
  tienda: string;
  sku: string;
  cliente: string | null;
  division: string | null;
  target_cb: number | null;
  real_cb: number | null;
  target_inf: number | null;
  real_inf: number | null;
  tipo_sku: string | null;
};

function lookupContacto(
  contactos: Map<string, ContactoRow>,
  tienda: string,
): ContactoRow | undefined {
  const fullKey = tiendaKeyFromHMPDV(tienda);
  const direct = contactos.get(fullKey);
  if (direct) return direct;
  const numMatch = fullKey.split("|")[0];
  if (!numMatch) return undefined;
  for (const [key, value] of contactos) {
    if (key.startsWith(numMatch + "|")) return value;
  }
  return undefined;
}

// Lee `cuadro_basico_semanal` y devuelve las filas en el formato DataRow
// que usa el dashboard. Apps Script ya aplicó los filtros (sin TOTAL,
// sin target=0, etc), así que acá solo hacemos enrichment con contactos
// y formato de salida.
export async function loadCBRowsFromSupabase(
  contactos: Map<string, ContactoRow>,
): Promise<{ rows: DataRow[]; semanas: number[] }> {
  const dbRows = await supabaseSelectAll<CBDB>("cuadro_basico_semanal", {
    select: "semana,tienda,sku,cliente,division,target_cb,real_cb,target_inf,real_inf,tipo_sku",
    order: "semana.asc",
  });

  const rows: DataRow[] = [];
  const semanasSet = new Set<number>();

  for (const r of dbRows) {
    const semana = r.semana;
    if (!Number.isFinite(semana)) continue;
    semanasSet.add(semana);
    const tienda = (r.tienda ?? "").trim();
    const sku = (r.sku ?? "").trim();
    if (!tienda || !sku) continue;

    const contacto = lookupContacto(contactos, tienda);
    const tipoSKU: DataRow["tipoSKU"] =
      (r.tipo_sku ?? "").toLowerCase() === "estratégico" ? "Estratégico" : "Infaltable";

    rows.push({
      semana,
      mes: semanaToMes(semana),
      sku,
      tienda,
      cliente: r.cliente ?? "",
      division: r.division ?? "",
      targetCB: r.target_cb ?? 0,
      realCB: r.real_cb ?? 0,
      targetInf: r.target_inf ?? 0,
      realInf: r.real_inf ?? 0,
      tipoSKU,
      promotor: contacto?.promotor || "Sin asignar",
      supervisor: contacto?.supervisor || "Sin asignar",
    });
  }

  const semanas = [...semanasSet].sort((a, b) => a - b);
  return { rows, semanas };
}
