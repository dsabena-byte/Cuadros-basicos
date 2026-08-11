// Análisis CB de Trade × Floor Share, ORGANIZADO POR CATEGORÍA.
//
// Regla de oro: nunca promediar entre categorías. Un cliente puede estar
// excelente en Lavado y pésimo en Cocción; el promedio miente. Por eso todo
// (CB y FS, y sus desvíos) se calcula y se muestra por categoría.
//
// Grano: categoría → cliente/cadena → tienda. Para cada nodo mostramos:
//   · Desvío CB  = %CB − 80        (¿tiene los SKUs del cuadro básico?)
//   · Desvío FS  = share − objetivo de la categoría (¿ocupa góndola?)
//   · SKUs de CB faltantes (a reponer) y el uplift de FS estimado al reponerlos.
//
// Fórmulas (idénticas al dashboard legacy):
//   %CB  = ΣrealCB / ΣtargetCB   ·   share Drean = uds Drean / uds Total
//   Total = fila "Total" del CSV si viene, si no la suma de todas las marcas.
//   Objetivos FS: Lavado 32 · Refrigeracion 25 · Coccion 23.

import type { DataRow } from "./parse";
import { normalizeStoreNumber } from "./parse";
import type { FloorShareDataset as FSDataset, FloorShareEnrichedRow as FSRow } from "./dataset-floorshare";

export const CB_OBJETIVO = 80;
export const FS_DREAN = "Drean";
export const FS_TARGETS: Record<string, number> = { lavado: 32, refrigeracion: 25, coccion: 23 };
const ORDEN_CAT = ["lavado", "refrigeracion", "coccion"];

export type Cuadrante = "sostener" | "ejecucion" | "surtido" | "fragil" | "sinFS";
export type SkuFaltanteTrade = { sku: string; tienda: string; tipo: string };

export type NodoTrade = {
  nombre: string;
  storeNumber?: string;
  // CB
  pctCB: number;
  desvCB: number;   // pp vs objetivo CB (80)
  realCB: number;
  targetCB: number;
  // FS
  fsShare: number | null;
  desvFS: number | null; // pp vs objetivo FS de la categoría
  objetivoFS: number | null;
  dreanUnits: number;
  totalUnits: number;
  // Cruce
  faltantes: SkuFaltanteTrade[];
  faltanInf: number;
  faltanEst: number;
  upliftPp: number | null;
  fsProyectado: number | null;
  cuadrante: Cuadrante;
  tiendas?: NodoTrade[]; // para nodos de cliente: desglose por tienda
};

export type CategoriaAnalisis = {
  categoria: string;   // "lavado" | "refrigeracion" | "coccion"
  objetivoFS: number | null;
  pctCB: number;
  desvCB: number;
  realCB: number;
  targetCB: number;
  fsShare: number | null;
  desvFS: number | null;
  dreanUnits: number;
  totalUnits: number;
  nTiendas: number;
  faltanTotal: number;
  clientes: NodoTrade[];
};

export type AnalisisTrade = {
  categorias: CategoriaAnalisis[];
  cobertura: { tiendasCB: number; tiendasFS: number; tiendasAmbas: number };
};

// ── helpers ──────────────────────────────────────────────────────────────

function catKey(s: string): string {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}
// Canoniza a las 3 categorías. Ojo: el CB trae "LAVADO Y SECADO" y "COCCIÓN".
function canonCat(s: string): string {
  const k = catKey(s);
  if (k.includes("lavad") || k.includes("secado")) return "lavado";
  if (k.includes("refriger") || k.includes("frio")) return "refrigeracion";
  if (k.includes("cocc") || k.includes("cocina")) return "coccion";
  return k;
}
export function fsTargetForCat(cat: string): number | null {
  const k = canonCat(cat);
  return Object.prototype.hasOwnProperty.call(FS_TARGETS, k) ? FS_TARGETS[k] : null;
}
function storeNumFromTienda(tienda: string): string {
  const m = (tienda || "").toString().trim().match(/^(\d+)\s*[-–]\s*/);
  return m ? normalizeStoreNumber(m[1]) : "";
}
const r1 = (x: number) => Math.round(x * 10) / 10;
function pct(real: number, target: number): number {
  return target > 0 ? Math.min(100, Math.round((real / target) * 100)) : 0;
}

// ── acumuladores ─────────────────────────────────────────────────────────

type CBAcc = { targetCB: number; realCB: number; faltantes: SkuFaltanteTrade[]; skusPresentes: number };
const nuevoCB = (): CBAcc => ({ targetCB: 0, realCB: 0, faltantes: [], skusPresentes: 0 });

type FSAcc = { dreanUnits: number; totalCol: number; allBrands: number };
const nuevoFS = (): FSAcc => ({ dreanUnits: 0, totalCol: 0, allBrands: 0 });
const fsTotal = (a: FSAcc) => a.totalCol || a.allBrands;

function acumularCB(acc: CBAcc, r: DataRow) {
  const tCB = r.targetCB || 0;
  const rCB = Math.min(r.realCB || 0, tCB);
  acc.targetCB += tCB;
  acc.realCB += rCB;
  if (tCB > 0) {
    if (rCB >= tCB) acc.skusPresentes += 1;
    else acc.faltantes.push({ sku: r.sku, tienda: r.tienda, tipo: r.tipoSKU });
  }
}
function acumularFS(acc: FSAcc, r: FSRow) {
  const u = r.units || 0;
  if ((r.brand || "").trim().toLowerCase() === "total") { acc.totalCol += u; return; }
  acc.allBrands += u;
  if (r.brand === FS_DREAN) acc.dreanUnits += u;
}
function mergeCB(accs: Iterable<CBAcc>): CBAcc {
  const o = nuevoCB();
  for (const a of accs) {
    o.targetCB += a.targetCB; o.realCB += a.realCB; o.skusPresentes += a.skusPresentes;
    o.faltantes.push(...a.faltantes);
  }
  return o;
}
function mergeFS(accs: Iterable<FSAcc>): FSAcc {
  const o = nuevoFS();
  for (const a of accs) { o.dreanUnits += a.dreanUnits; o.totalCol += a.totalCol; o.allBrands += a.allBrands; }
  return o;
}

// Colapsa a la semana más reciente (estado actual).
function latestCB(rows: DataRow[]): DataRow[] {
  const best = new Map<string, DataRow>();
  for (const r of rows) {
    const k = `${storeNumFromTienda(r.tienda)}||${canonCat(r.division)}||${r.sku}`;
    const prev = best.get(k);
    if (!prev || r.semana > prev.semana) best.set(k, r);
  }
  return [...best.values()];
}
function latestFS(rows: FSRow[]): FSRow[] {
  const best = new Map<string, FSRow>();
  for (const r of rows) {
    const sem = r.semana ?? -1;
    const k = `${r.storeNumber}||${canonCat(r.category)}||${r.brand}`;
    const prev = best.get(k);
    if (!prev || sem > (prev.semana ?? -1)) best.set(k, r);
  }
  return [...best.values()];
}

function clasificar(pctCB: number, share: number | null, obj: number | null): Cuadrante {
  if (share == null || obj == null) return "sinFS";
  const cbOk = pctCB >= CB_OBJETIVO;
  const fsOk = share >= obj;
  if (cbOk && fsOk) return "sostener";
  if (cbOk && !fsOk) return "ejecucion";
  if (!cbOk && !fsOk) return "surtido";
  return "fragil";
}

// Uplift de FS al reponer los SKUs de CB faltantes de ESA categoría. Cada SKU
// que pasa a presente suma ~k unidades Drean (k = uds Drean / SKUs presentes).
function uplift(cb: CBAcc, fs: FSAcc): { upliftPp: number | null; proyectado: number | null } {
  const total = fsTotal(fs);
  if (total <= 0 || fs.dreanUnits <= 0 || cb.skusPresentes <= 0 || cb.faltantes.length === 0) {
    return { upliftPp: null, proyectado: null };
  }
  const add = (fs.dreanUnits / cb.skusPresentes) * cb.faltantes.length;
  const actual = (fs.dreanUnits / total) * 100;
  const nuevo = ((fs.dreanUnits + add) / (total + add)) * 100;
  return { upliftPp: r1(nuevo - actual), proyectado: r1(nuevo) };
}

function nodo(nombre: string, cb: CBAcc, fs: FSAcc, objetivoFS: number | null, storeNumber?: string): NodoTrade {
  const pctCB = pct(cb.realCB, cb.targetCB);
  const total = fsTotal(fs);
  const share = total > 0 ? (fs.dreanUnits / total) * 100 : null;
  const up = uplift(cb, fs);
  let inf = 0, est = 0;
  for (const f of cb.faltantes) { if (f.tipo === "Infaltable") inf++; else est++; }
  return {
    nombre, storeNumber,
    pctCB, desvCB: pctCB - CB_OBJETIVO, realCB: cb.realCB, targetCB: cb.targetCB,
    fsShare: share == null ? null : r1(share),
    desvFS: share == null || objetivoFS == null ? null : r1(share - objetivoFS),
    objetivoFS,
    dreanUnits: Math.round(fs.dreanUnits), totalUnits: Math.round(total),
    faltantes: cb.faltantes, faltanInf: inf, faltanEst: est,
    upliftPp: up.upliftPp, fsProyectado: up.proyectado,
    cuadrante: clasificar(pctCB, share, objetivoFS),
  };
}

// Oportunidad: primero mayor uplift; a igualdad, mayor déficit de FS.
function ordenar(ns: NodoTrade[]): NodoTrade[] {
  return [...ns].sort((a, b) => {
    const ua = a.upliftPp ?? -1, ub = b.upliftPp ?? -1;
    if (ub !== ua) return ub - ua;
    return (a.desvFS ?? 999) - (b.desvFS ?? 999);
  });
}

function deep<T>(tree: Map<string, Map<string, Map<string, T>>>, a: string, b: string, c: string, factory: () => T): T {
  let m1 = tree.get(a); if (!m1) { m1 = new Map(); tree.set(a, m1); }
  let m2 = m1.get(b); if (!m2) { m2 = new Map(); m1.set(b, m2); }
  let v = m2.get(c); if (!v) { v = factory(); m2.set(c, v); }
  return v;
}

// ── entrada principal ──────────────────────────────────────────────────────

export function construirAnalisisTrade(rows: DataRow[], floorShare: FSDataset | null): AnalisisTrade {
  const cbRows = latestCB(rows.filter((r) => (r.targetCB || 0) > 0));
  const fsRows = latestFS(floorShare?.rows ?? []);

  const cadenaPorTienda = new Map<string, string>();
  const nombreTienda = new Map<string, string>();
  for (const r of cbRows) {
    const num = storeNumFromTienda(r.tienda);
    if (!num) continue;
    if (!cadenaPorTienda.has(num)) cadenaPorTienda.set(num, r.cliente || "Sin cadena");
    if (!nombreTienda.has(num)) nombreTienda.set(num, r.tienda);
  }

  // Árboles categoría → cadena → tienda.
  const cbTree = new Map<string, Map<string, Map<string, CBAcc>>>();
  for (const r of cbRows) {
    const num = storeNumFromTienda(r.tienda);
    if (!num) continue;
    acumularCB(deep(cbTree, canonCat(r.division), cadenaPorTienda.get(num) || "Sin cadena", num, nuevoCB), r);
  }
  const fsTree = new Map<string, Map<string, Map<string, FSAcc>>>();
  const tiendasFSset = new Set<string>();
  for (const r of fsRows) {
    const num = r.storeNumber;
    if (!num) continue;
    tiendasFSset.add(num);
    if (!cadenaPorTienda.has(num)) continue; // universo = tiendas del CB
    acumularFS(deep(fsTree, canonCat(r.category), cadenaPorTienda.get(num)!, num, nuevoFS), r);
  }

  const catsPresentes = new Set(cbTree.keys());
  const orden = [
    ...ORDEN_CAT.filter((c) => catsPresentes.has(c)),
    ...[...catsPresentes].filter((c) => !ORDEN_CAT.includes(c)),
  ];

  const categorias: CategoriaAnalisis[] = orden.map((cat) => {
    const objetivoFS = fsTargetForCat(cat);
    const cadenasMap = cbTree.get(cat)!;
    const fsCadenas = fsTree.get(cat);

    const clientes: NodoTrade[] = [];
    for (const [cad, tiendasMap] of cadenasMap) {
      const fsAccs: FSAcc[] = [];
      const tiendas: NodoTrade[] = [];
      for (const [num, cbT] of tiendasMap) {
        const fsT = fsCadenas?.get(cad)?.get(num) ?? nuevoFS();
        fsAccs.push(fsT);
        tiendas.push(nodo(nombreTienda.get(num) || num, cbT, fsT, objetivoFS, num));
      }
      const nodoCad = nodo(cad, mergeCB(tiendasMap.values()), mergeFS(fsAccs), objetivoFS);
      nodoCad.tiendas = ordenar(tiendas);
      clientes.push(nodoCad);
    }

    const cbCat = mergeCB([...cadenasMap.values()].flatMap((m) => [...m.values()]));
    const fsCat = mergeFS(fsCadenas ? [...fsCadenas.values()].flatMap((m) => [...m.values()]) : []);
    const pctCB = pct(cbCat.realCB, cbCat.targetCB);
    const total = fsTotal(fsCat);
    const share = total > 0 ? (fsCat.dreanUnits / total) * 100 : null;
    const nTiendas = new Set([...cadenasMap.values()].flatMap((m) => [...m.keys()])).size;

    return {
      categoria: cat,
      objetivoFS,
      pctCB,
      desvCB: pctCB - CB_OBJETIVO,
      realCB: cbCat.realCB,
      targetCB: cbCat.targetCB,
      fsShare: share == null ? null : r1(share),
      desvFS: share == null || objetivoFS == null ? null : r1(share - objetivoFS),
      dreanUnits: Math.round(fsCat.dreanUnits),
      totalUnits: Math.round(total),
      nTiendas,
      faltanTotal: cbCat.faltantes.length,
      clientes: ordenar(clientes),
    };
  });

  let tiendasAmbas = 0;
  for (const num of cadenaPorTienda.keys()) if (tiendasFSset.has(num)) tiendasAmbas += 1;

  return {
    categorias,
    cobertura: { tiendasCB: cadenaPorTienda.size, tiendasFS: tiendasFSset.size, tiendasAmbas },
  };
}
