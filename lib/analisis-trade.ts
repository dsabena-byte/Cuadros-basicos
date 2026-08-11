// Análisis cruzado CB de Trade × Floor Share, a nivel tienda.
//
// Idea: el CB de Trade mide PRESENCIA de los SKUs de Drean en la tienda
// (realCB/targetCB). Floor Share mide el SHARE de góndola de Drean vs la
// competencia. Si sumamos SKUs de CB (los faltantes pasan a presentes),
// suben las unidades Drean en piso → sube el share. Esta librería cruza
// ambos por tienda (misma llave `tienda`, mismo enriquecimiento de
// contactos) y arma la matriz "problema de compra vs problema de ejecución"
// + una proyección de uplift de FS al cerrar el CB.
//
// Todas las fórmulas replican las del dashboard legacy:
//   CB:  pctCB  = ΣrealCB / ΣtargetCB     (realCB clampeado a targetCB)
//        pctInf = ΣrealInf / ΣtargetInf
//   FS:  share Drean = unidades Drean / unidades Total (fila "Total" del CSV)
//   Objetivos FS por categoría: Lavado 32 · Refrigeracion 25 · Coccion 23

import type { DataRow } from "./parse";
import type { FloorShareDataset, FloorShareEnrichedRow } from "./dataset-floorshare";
import { normalizeStoreNumber } from "./parse";

export const CB_OBJETIVO = 80; // % de cumplimiento CB objetivo
export const FS_DREAN = "Drean";
export const FS_TARGETS: Record<string, number> = { lavado: 32, refrigeracion: 25, coccion: 23 };

export type Cuadrante = "sostener" | "ejecucion" | "surtido" | "fragil" | "sinFS";

export type SkuFaltanteTrade = { sku: string; tienda: string; categoria: string; tipo: string };

export type SegmentoTrade = {
  nombre: string;
  tipo: "cadena" | "promotor" | "supervisor" | "tienda";
  cadena?: string;      // para tiendas: su cadena
  promotor?: string;    // para tiendas
  supervisor?: string;  // para tiendas
  storeNumber?: string; // para tiendas
  // CB de Trade
  pctCB: number;
  realCB: number;
  targetCB: number;
  pctInf: number;
  realInf: number;
  targetInf: number;
  // Floor Share
  fsShare: number | null;   // null = sin datos de FS en el segmento
  fsTarget: number | null;  // objetivo ponderado por unidades de las categorías presentes
  dreanUnits: number;
  totalUnits: number;
  // Cruce
  cuadrante: Cuadrante;
  skusFaltantes: SkuFaltanteTrade[];
  upliftPp: number | null;  // Δ de share proyectado al cerrar los SKUs faltantes de CB
  fsShareProyectado: number | null;
  tiendas: number;          // # de tiendas en el segmento (1 para tipo "tienda")
};

export type AnalisisTrade = {
  global: {
    pctCB: number; realCB: number; targetCB: number;
    fsShare: number | null; fsTarget: number | null; dreanUnits: number; totalUnits: number;
    tiendas: number; tiendasConFS: number;
  };
  matriz: Record<Cuadrante, number>; // # tiendas en cada cuadrante
  cadenas: SegmentoTrade[];
  promotores: SegmentoTrade[];
  supervisores: SegmentoTrade[];
  tiendasSeg: SegmentoTrade[];
  categorias: { categoria: string; fsShare: number | null; fsTarget: number | null; pctCB: number; dreanUnits: number; totalUnits: number }[];
  cobertura: { tiendasCB: number; tiendasFS: number; tiendasAmbas: number };
};

// ── helpers ──────────────────────────────────────────────────────────────

function catKey(s: string): string {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

export function fsTargetForCat(cat: string): number | null {
  const k = catKey(cat);
  return Object.prototype.hasOwnProperty.call(FS_TARGETS, k) ? FS_TARGETS[k] : null;
}

// Número de tienda desde un `tienda` de CB-Trade ("1 - Casa Del Audio Canning").
function storeNumFromTienda(tienda: string): string {
  const m = (tienda || "").toString().trim().match(/^(\d+)\s*[-–]\s*/);
  return m ? normalizeStoreNumber(m[1]) : "";
}

// ── acumuladores ─────────────────────────────────────────────────────────

type CBAcc = {
  targetCB: number; realCB: number; targetInf: number; realInf: number;
  faltantes: SkuFaltanteTrade[];
  skusPresentes: number; // # de SKUs de CB actualmente presentes (para calibrar uplift)
};
function nuevoCB(): CBAcc {
  return { targetCB: 0, realCB: 0, targetInf: 0, realInf: 0, faltantes: [], skusPresentes: 0 };
}

type FSCat = { drean: number; totalCol: number; allBrands: number };
type FSAcc = { dreanUnits: number; totalCol: number; allBrands: number; porCat: Map<string, FSCat> };
function nuevoFS(): FSAcc {
  return { dreanUnits: 0, totalCol: 0, allBrands: 0, porCat: new Map() };
}
// Denominador del share: la fila "Total" del CSV si viene; si no, la suma de
// todas las marcas (mismo fallback `totalFromColumn || total` que el legacy).
function fsTotal(a: { totalCol: number; allBrands: number }): number {
  return a.totalCol || a.allBrands;
}

// Colapsa las filas CB de una tienda-sku a su semana más reciente (estado actual).
function latestPorSkuTienda(rows: DataRow[]): DataRow[] {
  const best = new Map<string, DataRow>();
  for (const r of rows) {
    const num = storeNumFromTienda(r.tienda);
    const k = `${num}||${catKey(r.division)}||${r.sku}`;
    const prev = best.get(k);
    if (!prev || r.semana > prev.semana) best.set(k, r);
  }
  return [...best.values()];
}

// Colapsa las filas FS a su semana más reciente por tienda-categoría-marca.
function latestFS(rows: FloorShareEnrichedRow[]): FloorShareEnrichedRow[] {
  const best = new Map<string, FloorShareEnrichedRow>();
  for (const r of rows) {
    const sem = r.semana ?? -1;
    const k = `${r.storeNumber}||${catKey(r.category)}||${r.brand}`;
    const prev = best.get(k);
    const prevSem = prev?.semana ?? -1;
    if (!prev || sem > prevSem) best.set(k, r);
  }
  return [...best.values()];
}

function acumularCB(acc: CBAcc, r: DataRow) {
  const tCB = r.targetCB || 0;
  const rCB = Math.min(r.realCB || 0, tCB);
  const tInf = r.targetInf || 0;
  const rInf = Math.min(r.realInf || 0, tInf);
  acc.targetCB += tCB;
  acc.realCB += rCB;
  acc.targetInf += tInf;
  acc.realInf += rInf;
  if (tCB > 0) {
    if (rCB >= tCB) acc.skusPresentes += 1;
    else acc.faltantes.push({ sku: r.sku, tienda: r.tienda, categoria: r.division, tipo: r.tipoSKU });
  }
}

function acumularFS(acc: FSAcc, r: FloorShareEnrichedRow) {
  const u = r.units || 0;
  const ck = catKey(r.category);
  let c = acc.porCat.get(ck);
  if (!c) { c = { drean: 0, totalCol: 0, allBrands: 0 }; acc.porCat.set(ck, c); }
  if ((r.brand || "").trim().toLowerCase() === "total") {
    acc.totalCol += u;
    c.totalCol += u;
    return;
  }
  acc.allBrands += u;
  c.allBrands += u;
  if (r.brand === FS_DREAN) { acc.dreanUnits += u; c.drean += u; }
}

// Share y objetivo ponderado de un acumulador FS. Si el CSV no traía fila
// "Total", cae a la suma de todas las marcas (que acá no guardamos aparte),
// por eso el total se toma de la fila "Total" — consistente con el legacy.
function shareDe(fs: FSAcc): { share: number | null; target: number | null } {
  const total = fsTotal(fs);
  if (total <= 0) return { share: null, target: null };
  const share = (fs.dreanUnits / total) * 100;
  // objetivo ponderado por unidades totales de cada categoría presente
  let tw = 0, w = 0;
  for (const [ck, v] of fs.porCat) {
    const t = fsTargetForCat(ck);
    const vt = fsTotal(v);
    if (t != null && vt > 0) { tw += t * vt; w += vt; }
  }
  return { share, target: w > 0 ? tw / w : null };
}

function pct(real: number, target: number): number {
  return target > 0 ? Math.min(100, Math.round((real / target) * 100)) : 0;
}

// Proyección de uplift: cada SKU faltante que pase a presente suma ~k unidades
// Drean en góndola, con k = unidades Drean actuales / SKUs de CB presentes
// (calibrado con la propia data de la tienda/segmento). Es una ESTIMACIÓN.
function uplift(cb: CBAcc, fs: FSAcc): { upliftPp: number | null; proyectado: number | null } {
  const total = fsTotal(fs);
  if (total <= 0 || fs.dreanUnits <= 0 || cb.skusPresentes <= 0 || cb.faltantes.length === 0) {
    return { upliftPp: null, proyectado: null };
  }
  const k = fs.dreanUnits / cb.skusPresentes;
  const add = k * cb.faltantes.length;
  const shareActual = (fs.dreanUnits / total) * 100;
  const shareNuevo = ((fs.dreanUnits + add) / (total + add)) * 100;
  return { upliftPp: Math.round((shareNuevo - shareActual) * 10) / 10, proyectado: Math.round(shareNuevo * 10) / 10 };
}

function clasificarCuadrante(pctCB: number, share: number | null, target: number | null): Cuadrante {
  if (share == null || target == null) return "sinFS";
  const cbOk = pctCB >= CB_OBJETIVO;
  const fsOk = share >= target;
  if (cbOk && fsOk) return "sostener";
  if (cbOk && !fsOk) return "ejecucion"; // compra el surtido pero mal exhibido
  if (!cbOk && !fsOk) return "surtido";  // falta surtido → cerrar CB sube share
  return "fragil";                        // FS alto con CB bajo
}

// ── construcción del segmento ──────────────────────────────────────────────

function armarSegmento(
  nombre: string,
  tipo: SegmentoTrade["tipo"],
  cb: CBAcc,
  fs: FSAcc,
  tiendas: number,
  extra?: { cadena?: string; promotor?: string; supervisor?: string; storeNumber?: string },
): SegmentoTrade {
  const { share, target } = shareDe(fs);
  const up = uplift(cb, fs);
  return {
    nombre,
    tipo,
    cadena: extra?.cadena,
    promotor: extra?.promotor,
    supervisor: extra?.supervisor,
    storeNumber: extra?.storeNumber,
    pctCB: pct(cb.realCB, cb.targetCB),
    realCB: cb.realCB,
    targetCB: cb.targetCB,
    pctInf: pct(cb.realInf, cb.targetInf),
    realInf: cb.realInf,
    targetInf: cb.targetInf,
    fsShare: share == null ? null : Math.round(share * 10) / 10,
    fsTarget: target == null ? null : Math.round(target * 10) / 10,
    dreanUnits: Math.round(fs.dreanUnits),
    totalUnits: Math.round(fsTotal(fs)),
    cuadrante: clasificarCuadrante(pct(cb.realCB, cb.targetCB), share, target),
    skusFaltantes: cb.faltantes,
    upliftPp: up.upliftPp,
    fsShareProyectado: up.proyectado,
    tiendas,
  };
}

// ── entrada principal ──────────────────────────────────────────────────────

export function construirAnalisisTrade(
  rows: DataRow[],
  floorShare: FloorShareDataset | null,
): AnalisisTrade {
  const cbRows = latestPorSkuTienda(rows.filter((r) => (r.targetCB || 0) > 0));
  const fsRows = latestFS(floorShare?.rows ?? []);

  // Nombre de cadena por número de tienda (desde CB-Trade: r.cliente).
  const cadenaPorTienda = new Map<string, string>();
  const promotorPorTienda = new Map<string, string>();
  const supervisorPorTienda = new Map<string, string>();
  for (const r of cbRows) {
    const num = storeNumFromTienda(r.tienda);
    if (num && !cadenaPorTienda.has(num)) cadenaPorTienda.set(num, r.cliente || "Sin cadena");
    if (num && !promotorPorTienda.has(num)) promotorPorTienda.set(num, r.promotor || "Sin promotor");
    if (num && !supervisorPorTienda.has(num)) supervisorPorTienda.set(num, r.supervisor || "Sin supervisor");
  }
  // Completar con FS (algunas tiendas pueden tener FS y no CB, y viceversa).
  for (const r of fsRows) {
    const num = r.storeNumber;
    if (num && !cadenaPorTienda.has(num)) cadenaPorTienda.set(num, r.cliente || "Sin cadena");
    if (num && !promotorPorTienda.has(num)) promotorPorTienda.set(num, r.promotor || "Sin promotor");
    if (num && !supervisorPorTienda.has(num)) supervisorPorTienda.set(num, r.supervisor || "Sin supervisor");
  }

  // Acumular por tienda.
  const cbPorTienda = new Map<string, CBAcc>();
  const fsPorTienda = new Map<string, FSAcc>();
  const nombreTienda = new Map<string, string>();
  for (const r of cbRows) {
    const num = storeNumFromTienda(r.tienda);
    if (!num) continue;
    if (!nombreTienda.has(num)) nombreTienda.set(num, r.tienda);
    let a = cbPorTienda.get(num);
    if (!a) { a = nuevoCB(); cbPorTienda.set(num, a); }
    acumularCB(a, r);
  }
  for (const r of fsRows) {
    const num = r.storeNumber;
    if (!num) continue;
    if (!nombreTienda.has(num)) nombreTienda.set(num, `${num} - ${r.storeName}`);
    let a = fsPorTienda.get(num);
    if (!a) { a = nuevoFS(); fsPorTienda.set(num, a); }
    acumularFS(a, r);
  }

  // El cruce se hace sobre las tiendas del CB (donde "cerrar CB" es accionable);
  // a cada una se le adjunta su Floor Share si existe. Las tiendas con FS pero
  // sin CB no entran acá (no hay palanca de CB que accionar en ellas).
  const todasTiendas = new Set<string>(cbPorTienda.keys());

  // Segmentos por tienda.
  const tiendasSeg: SegmentoTrade[] = [];
  for (const num of todasTiendas) {
    const cb = cbPorTienda.get(num) ?? nuevoCB();
    const fs = fsPorTienda.get(num) ?? nuevoFS();
    if (cb.targetCB === 0) continue;
    tiendasSeg.push(
      armarSegmento(nombreTienda.get(num) || num, "tienda", cb, fs, 1, {
        cadena: cadenaPorTienda.get(num),
        promotor: promotorPorTienda.get(num),
        supervisor: supervisorPorTienda.get(num),
        storeNumber: num,
      }),
    );
  }

  // Rollups por agrupador.
  const rollup = (
    tipo: SegmentoTrade["tipo"],
    keyPorTienda: Map<string, string>,
  ): SegmentoTrade[] => {
    const cbG = new Map<string, CBAcc>();
    const fsG = new Map<string, FSAcc>();
    const setTiendas = new Map<string, Set<string>>();
    for (const num of todasTiendas) {
      const key = keyPorTienda.get(num) || "Sin asignar";
      let cb = cbG.get(key); if (!cb) { cb = nuevoCB(); cbG.set(key, cb); }
      let fs = fsG.get(key); if (!fs) { fs = nuevoFS(); fsG.set(key, fs); }
      let st = setTiendas.get(key); if (!st) { st = new Set(); setTiendas.set(key, st); }
      st.add(num);
      const cbT = cbPorTienda.get(num);
      if (cbT) {
        cb.targetCB += cbT.targetCB; cb.realCB += cbT.realCB;
        cb.targetInf += cbT.targetInf; cb.realInf += cbT.realInf;
        cb.skusPresentes += cbT.skusPresentes;
        cb.faltantes.push(...cbT.faltantes);
      }
      const fsT = fsPorTienda.get(num);
      if (fsT) {
        fs.dreanUnits += fsT.dreanUnits; fs.totalCol += fsT.totalCol; fs.allBrands += fsT.allBrands;
        for (const [ck, v] of fsT.porCat) {
          let c = fs.porCat.get(ck); if (!c) { c = { drean: 0, totalCol: 0, allBrands: 0 }; fs.porCat.set(ck, c); }
          c.drean += v.drean; c.totalCol += v.totalCol; c.allBrands += v.allBrands;
        }
      }
    }
    const out: SegmentoTrade[] = [];
    for (const key of cbG.keys()) {
      const cb = cbG.get(key)!; const fs = fsG.get(key)!;
      if (cb.targetCB === 0 && fsTotal(fs) === 0) continue;
      out.push(armarSegmento(key, tipo, cb, fs, setTiendas.get(key)?.size ?? 0));
    }
    return out;
  };

  const cadenas = rollup("cadena", cadenaPorTienda);
  const promotores = rollup("promotor", promotorPorTienda);
  const supervisores = rollup("supervisor", supervisorPorTienda);

  // Global.
  const cbGlobal = nuevoCB();
  const fsGlobal = nuevoFS();
  for (const a of cbPorTienda.values()) {
    cbGlobal.targetCB += a.targetCB; cbGlobal.realCB += a.realCB;
    cbGlobal.targetInf += a.targetInf; cbGlobal.realInf += a.realInf;
    cbGlobal.skusPresentes += a.skusPresentes; cbGlobal.faltantes.push(...a.faltantes);
  }
  for (const num of todasTiendas) {
    const a = fsPorTienda.get(num);
    if (!a) continue;
    fsGlobal.dreanUnits += a.dreanUnits; fsGlobal.totalCol += a.totalCol; fsGlobal.allBrands += a.allBrands;
    for (const [ck, v] of a.porCat) {
      let c = fsGlobal.porCat.get(ck); if (!c) { c = { drean: 0, totalCol: 0, allBrands: 0 }; fsGlobal.porCat.set(ck, c); }
      c.drean += v.drean; c.totalCol += v.totalCol; c.allBrands += v.allBrands;
    }
  }
  const gShare = shareDe(fsGlobal);

  // Categorías (barras FS vs objetivo + CB por categoría).
  const cbPorCat = new Map<string, { target: number; real: number }>();
  for (const r of cbRows) {
    const ck = catKey(r.division);
    let c = cbPorCat.get(ck); if (!c) { c = { target: 0, real: 0 }; cbPorCat.set(ck, c); }
    c.target += r.targetCB || 0; c.real += Math.min(r.realCB || 0, r.targetCB || 0);
  }
  const categorias = [...fsGlobal.porCat.keys()].map((ck) => {
    const v = fsGlobal.porCat.get(ck)!;
    const cbc = cbPorCat.get(ck);
    const vt = fsTotal(v);
    return {
      categoria: ck,
      fsShare: vt > 0 ? Math.round((v.drean / vt) * 1000) / 10 : null,
      fsTarget: fsTargetForCat(ck),
      pctCB: cbc ? pct(cbc.real, cbc.target) : 0,
      dreanUnits: Math.round(v.drean),
      totalUnits: Math.round(vt),
    };
  });

  // Matriz (conteo de tiendas por cuadrante).
  const matriz: Record<Cuadrante, number> = { sostener: 0, ejecucion: 0, surtido: 0, fragil: 0, sinFS: 0 };
  for (const t of tiendasSeg) matriz[t.cuadrante] += 1;

  const tiendasCB = cbPorTienda.size;
  const tiendasFS = fsPorTienda.size;
  let tiendasAmbas = 0;
  for (const num of cbPorTienda.keys()) if (fsPorTienda.has(num)) tiendasAmbas += 1;

  return {
    global: {
      pctCB: pct(cbGlobal.realCB, cbGlobal.targetCB),
      realCB: cbGlobal.realCB,
      targetCB: cbGlobal.targetCB,
      fsShare: gShare.share == null ? null : Math.round(gShare.share * 10) / 10,
      fsTarget: gShare.target == null ? null : Math.round(gShare.target * 10) / 10,
      dreanUnits: Math.round(fsGlobal.dreanUnits),
      totalUnits: Math.round(fsTotal(fsGlobal)),
      tiendas: todasTiendas.size,
      tiendasConFS: tiendasAmbas,
    },
    matriz,
    cadenas,
    promotores,
    supervisores,
    tiendasSeg,
    categorias,
    cobertura: { tiendasCB, tiendasFS, tiendasAmbas },
  };
}
