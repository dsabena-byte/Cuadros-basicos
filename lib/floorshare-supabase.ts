import { supabaseSelectAll } from "./supabase";
import { monthLabelFromCode, type FloorShareRow } from "./parse-floorshare";
import {
  canonicalizePromotorNames,
  type ContactoRow,
} from "./parse";
import {
  PROMOTOR_NO_MAPEO,
  PROMOTOR_SIN,
  SUPERVISOR_NO_MAPEO,
  SUPERVISOR_SIN,
  applyManualContactos,
  buildCadenasByFirstWord,
  buildContactosByName,
  canonicalizeCliente,
  inferClienteFromName,
  isExcludedStore,
  lookupFloorShareContacto,
  lookupStoreOverride,
  type FloorShareDataset,
  type FloorShareEnrichedRow,
} from "./dataset-floorshare";

type FloorShareDB = {
  periodo: string;
  semana: number | null;
  categoria: string;
  numero_tienda: string;
  nombre_tienda: string;
  marca: string;
  unidades: number | null;
  pct_raw: number | null;
};

// Calendario fiscal 5-4-4: misma fórmula que semanaToMes() en lib/parse.ts.
// Devuelve el código YYYY-MM correspondiente al mes fiscal de la semana.
function weekToMonthCode(week: number, year: string): string {
  const idx = Math.min(11, Math.max(0, Math.floor((week - 1) / 4.33)));
  const monthNum = idx + 1;
  return `${year}-${String(monthNum).padStart(2, "0")}`;
}

// Carga floor share desde Supabase y devuelve el mismo FloorShareDataset que
// produce buildFloorShareDataset (Drive). Para preservar el comportamiento
// actual del dashboard, solo trae filas mensuales (semana IS NULL).
//
// Aplica idéntica lógica de enrichment: applyManualContactos, lookup de
// contacto, inferencia de cliente desde el nombre, overrides de tienda,
// exclusiones, y tracking de diagnóstico.
export async function buildFloorShareDatasetFromSupabase(
  contactos: Map<string, ContactoRow>,
): Promise<FloorShareDataset> {
  // Trabajamos sobre una copia para no mutar el mapa global con applyManualContactos.
  const mergedContactos = new Map(contactos);
  canonicalizePromotorNames(mergedContactos);
  applyManualContactos(mergedContactos);
  const cadenasByFirstWord = buildCadenasByFirstWord(mergedContactos);
  const contactosByName = buildContactosByName(mergedContactos);

  const dbRows = await supabaseSelectAll<FloorShareDB>("floor_share", {
    select: "periodo,semana,categoria,numero_tienda,nombre_tienda,marca,unidades,pct_raw",
    order: "periodo.asc,categoria.asc",
  });

  const rawRows: FloorShareRow[] = [];
  for (const r of dbRows) {
    const units = r.unidades ?? 0;
    if (units <= 0) continue;
    const periodo = (r.periodo || "").trim();
    let month: string;
    let semana: number | null;
    if (/^\d{4}-\d{2}$/.test(periodo)) {
      // Periodo mensual: "2026-04"
      month = periodo;
      semana = null;
    } else if (/^\d{4}-W\d{1,2}$/i.test(periodo) && r.semana !== null) {
      // Periodo semanal: "2026-W14" → derivamos el mes vía calendario fiscal.
      const year = periodo.slice(0, 4);
      month = weekToMonthCode(r.semana, year);
      semana = r.semana;
    } else {
      continue;
    }
    rawRows.push({
      month,
      monthLabel: monthLabelFromCode(month),
      category: (r.categoria || "").toLowerCase(),
      storeNumber: (r.numero_tienda || "").trim(),
      storeName: (r.nombre_tienda || "").trim(),
      brand: (r.marca || "").trim(),
      units,
      pctRaw: r.pct_raw,
      semana,
    });
  }

  const allRows: FloorShareEnrichedRow[] = [];
  const seenStoreKeys = new Set<string>();
  const matchedStoreKeys = new Set<string>();
  const unmatchedSamples: { storeNumber: string; storeName: string }[] = [];
  const unmappedStores: {
    storeNumber: string;
    storeName: string;
    cliente: string;
  }[] = [];
  const noPromotorStores: {
    storeNumber: string;
    storeName: string;
    cliente: string;
    supervisor: string;
  }[] = [];

  for (const r of rawRows) {
    if (isExcludedStore(r.storeName)) continue;
    const overridden = lookupStoreOverride(r.storeNumber, r.storeName);
    const rawCliente =
      overridden || inferClienteFromName(r.storeName, cadenasByFirstWord);
    const contacto = lookupFloorShareContacto(
      mergedContactos,
      contactosByName,
      r.storeNumber,
      r.storeName,
    );
    const cliente = canonicalizeCliente(rawCliente);
    const promotorRaw = (contacto?.promotor || "").trim();
    const supervisorRaw = (contacto?.supervisor || "").trim();
    const promotorLabel = !contacto
      ? PROMOTOR_NO_MAPEO
      : promotorRaw || PROMOTOR_SIN;
    const supervisorLabel = !contacto
      ? SUPERVISOR_NO_MAPEO
      : supervisorRaw || SUPERVISOR_SIN;

    const storeKey = (r.storeNumber || "") + "|" + (r.storeName || "");
    if (!seenStoreKeys.has(storeKey)) {
      seenStoreKeys.add(storeKey);
      if (contacto) {
        matchedStoreKeys.add(storeKey);
        if (!promotorRaw) {
          noPromotorStores.push({
            storeNumber: r.storeNumber,
            storeName: r.storeName,
            cliente,
            supervisor: supervisorRaw,
          });
        }
      } else {
        unmappedStores.push({
          storeNumber: r.storeNumber,
          storeName: r.storeName,
          cliente,
        });
        if (unmatchedSamples.length < 20) {
          unmatchedSamples.push({
            storeNumber: r.storeNumber,
            storeName: r.storeName,
          });
        }
      }
    }

    allRows.push({
      ...r,
      cliente,
      promotor: promotorLabel,
      supervisor: supervisorLabel,
    });
  }

  const months = [...new Set(allRows.map((r) => r.month))].sort();
  const categories = [...new Set(allRows.map((r) => r.category))].sort();
  const brands = [
    ...new Set(allRows.map((r) => r.brand).filter((b) => b && b.toLowerCase() !== "total")),
  ].sort();

  const totalStores = seenStoreKeys.size;
  const matchedStores = matchedStoreKeys.size;
  const matchRate = totalStores > 0 ? matchedStores / totalStores : 0;

  const sortStores = <T extends { storeNumber: string; storeName: string }>(arr: T[]) =>
    arr.sort((a, b) => {
      const na = parseInt(a.storeNumber, 10);
      const nb = parseInt(b.storeNumber, 10);
      if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
      return (a.storeName || "").localeCompare(b.storeName || "", "es", {
        sensitivity: "base",
      });
    });
  sortStores(unmappedStores);
  sortStores(noPromotorStores);

  return {
    rows: allRows,
    months,
    categories,
    brands,
    generatedAt: new Date().toISOString(),
    fileCount: months.length * categories.length,
    contactosDebug: {
      localFile: null,
      localCount: 0,
      globalCount: contactos.size,
      mergedCount: mergedContactos.size,
      unmatchedSample: unmatchedSamples,
      matchRate,
    },
    diagnostic: {
      totalStores,
      unmappedCount: unmappedStores.length,
      noPromotorCount: noPromotorStores.length,
      unmapped: unmappedStores,
      noPromotor: noPromotorStores,
    },
  };
}
