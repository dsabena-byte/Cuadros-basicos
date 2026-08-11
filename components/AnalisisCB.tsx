"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, Trophy, Building2, BarChart3, Users, ChevronRight, ChevronDown } from "lucide-react";

const OBJETIVO = 80;

export type SkuFaltante = { sku: string; cliente: string; categoria: string; tipo: string };

export type SegAnalisis = {
  nombre: string;
  pctCB: number;
  totalCB: number;
  cumplidosCB: number;
  faltan80: number; // SKUs a recuperar en el segmento para llegar al 80%
  extra?: string;    // dato de contexto (ej. gerente del vendedor)
  skusFaltantes?: SkuFaltante[]; // SKUs del CB no cumplidos (para desplegar al click)
};

export type AnalisisData = {
  global: { pctCB: number; totalCB: number; cumplidosCB: number; brechaPp: number; faltan80: number };
  evolucion: { puntos: { mes: string; pctCB: number }[]; ultimo: number | null; primero: number | null; primerMes: string | null; deltaMes: number | null; deltaDesdeInicio: number | null };
  dims: {
    categoria: SegAnalisis[];
    tipologia: SegAnalisis[];
    gerencia: SegAnalisis[];
    vendedor: SegAnalisis[];
    cliente: SegAnalisis[];
  };
};

const fmtSku = (n: number) => `${n} ${n === 1 ? "SKU" : "SKUs"}`;

function pctColor(pct: number): string {
  if (pct >= OBJETIVO) return "text-emerald-600";
  if (pct >= 70) return "text-amber-600";
  return "text-rose-600";
}
function pctBg(pct: number): string {
  if (pct >= OBJETIVO) return "bg-emerald-50 text-emerald-700";
  if (pct >= 70) return "bg-amber-50 text-amber-700";
  return "bg-rose-50 text-rose-700";
}

function debajo(segs: SegAnalisis[]): SegAnalisis[] {
  return segs.filter((s) => s.pctCB < OBJETIVO && s.faltan80 > 0).sort((a, b) => b.faltan80 - a.faltan80);
}

// Detalle desplegable de los SKUs a recuperar de un segmento.
function SkusDetalle({ skus }: { skus?: SkuFaltante[] }) {
  if (!skus || skus.length === 0) return <div className="text-[11px] text-slate-400 px-2 py-1.5">Sin SKUs a recuperar en este segmento.</div>;
  const orden = [...skus].sort((a, b) => a.cliente.localeCompare(b.cliente) || a.categoria.localeCompare(b.categoria));
  return (
    <div className="mt-1 mb-1 rounded border border-slate-200 bg-slate-50 max-h-56 overflow-auto">
      <div className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 px-2 py-1 border-b border-slate-200">{skus.length} SKUs a recuperar</div>
      <table className="w-full text-[11px]">
        <tbody>
          {orden.map((s, i) => (
            <tr key={`${s.sku}-${s.cliente}-${i}`} className="border-t border-slate-100 first:border-t-0">
              <td className="px-2 py-1 font-mono text-slate-800 whitespace-nowrap">{s.sku}</td>
              <td className="px-2 py-1 text-slate-600 truncate max-w-[180px]" title={s.cliente}>{s.cliente}</td>
              <td className="px-2 py-1 text-slate-500 whitespace-nowrap">{s.categoria}</td>
              <td className="px-2 py-1 whitespace-nowrap"><span className={`px-1 rounded text-[10px] font-medium ${s.tipo === "INFALTABLE" ? "bg-violet-100 text-violet-700" : "bg-pink-100 text-pink-700"}`}>{s.tipo === "INFALTABLE" ? "INF" : "EST"}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Card de una dimensión (Categoría / Tipología / Gerencia): segmentos a mejorar, clickeables.
function DimCard({ titulo, icon, segs, prefix, abiertos, toggle }: { titulo: string; icon: React.ReactNode; segs: SegAnalisis[]; prefix: string; abiertos: Set<string>; toggle: (k: string) => void }) {
  const bajo = debajo(segs);
  const enObjetivo = segs.filter((s) => s.pctCB >= OBJETIVO);
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="text-sm font-bold text-slate-900">{titulo}</h4>
      </div>
      {bajo.length === 0 ? (
        <p className="text-xs text-emerald-700 bg-emerald-50 rounded p-2">✓ Todos los segmentos están en el objetivo (≥{OBJETIVO}%).</p>
      ) : (
        <>
          <p className="text-xs text-slate-600 mb-2">
            {bajo.length} de {segs.length} por debajo del objetivo. Tocá una fila para ver los SKUs a recuperar.
          </p>
          <div className="space-y-0.5">
            {bajo.map((s) => {
              const k = `${prefix}:${s.nombre}`;
              const open = abiertos.has(k);
              return (
                <div key={s.nombre}>
                  <button onClick={() => toggle(k)} className="w-full flex items-center gap-2 text-xs py-1 px-1 rounded hover:bg-slate-50 text-left">
                    {open ? <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                    <span className="w-36 shrink-0 truncate text-slate-700" title={s.nombre}>{s.nombre}</span>
                    <div className="flex-1 h-2 rounded bg-slate-100 overflow-hidden">
                      <div className="h-2 rounded bg-rose-400" style={{ width: `${Math.min(100, s.pctCB)}%` }} />
                    </div>
                    <span className={`w-10 text-right tabular-nums font-semibold ${pctColor(s.pctCB)}`}>{s.pctCB}%</span>
                    <span className="w-12 text-right tabular-nums text-rose-600">{s.pctCB - OBJETIVO} pp</span>
                    <span className="w-24 text-right tabular-nums text-slate-500">recuperar {s.faltan80}</span>
                  </button>
                  {open && <SkusDetalle skus={s.skusFaltantes} />}
                </div>
              );
            })}
          </div>
          {enObjetivo.length > 0 && (
            <p className="text-[11px] text-emerald-600 mt-2">En objetivo: {enObjetivo.map((s) => `${s.nombre} (${s.pctCB}%)`).join(" · ")}</p>
          )}
        </>
      )}
    </div>
  );
}

// Bloque de análisis de una tabla (Vendedor / Cliente): peores + quick wins, clickeables.
function TablaAnalisis({ titulo, icon, columna, segs, prefix, abiertos, toggle }: { titulo: string; icon: React.ReactNode; columna: string; segs: SegAnalisis[]; prefix: string; abiertos: Set<string>; toggle: (k: string) => void }) {
  const bajo = debajo(segs);
  const quickWins = bajo.filter((s) => s.pctCB >= 70).slice(0, 6);
  const focos = bajo.slice(0, 10);
  const enObj = segs.filter((s) => s.pctCB >= OBJETIVO).length;

  const Fila = ({ s, kprefix, showBrecha }: { s: SegAnalisis; kprefix: string; showBrecha?: boolean }) => {
    const k = `${prefix}:${kprefix}:${s.nombre}`;
    const open = abiertos.has(k);
    return (
      <>
        <button onClick={() => toggle(k)} className="w-full flex items-center gap-2 text-xs py-1 px-1 rounded hover:bg-slate-50 text-left border-t border-slate-100">
          {open ? <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
          <span className="flex-1 truncate" title={s.nombre}>{s.nombre}{s.extra ? <span className="text-slate-400"> · {s.extra}</span> : null}</span>
          <span className={`w-10 text-right tabular-nums font-semibold ${pctColor(s.pctCB)}`}>{s.pctCB}%</span>
          {showBrecha && <span className="w-12 text-right tabular-nums text-rose-600">{s.pctCB - OBJETIVO} pp</span>}
          <span className="w-20 text-right tabular-nums text-slate-700 font-medium">recuperar {s.faltan80}</span>
        </button>
        {open && <SkusDetalle skus={s.skusFaltantes} />}
      </>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="text-sm font-bold text-slate-900">{titulo}</h4>
      </div>
      <p className="text-xs text-slate-600 mb-3">
        {enObj} de {segs.length} en objetivo · <strong className="text-rose-700">{bajo.length}</strong> por debajo del 80%. Tocá una fila para ver los SKUs a recuperar.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-600 mb-1">🎯 Mayor impacto (más SKUs a recuperar)</div>
          {focos.length === 0 ? <p className="text-xs text-emerald-600 py-1">Todos en objetivo 🎉</p> : focos.map((s) => <Fila key={s.nombre} s={s} kprefix="foco" showBrecha />)}
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 mb-1">⚡ Quick wins (a un paso del 80%)</div>
          {quickWins.length === 0 ? <p className="text-xs text-slate-500 py-1">No hay segmentos entre 70% y 80% — los que faltan están más lejos.</p> : quickWins.map((s) => <Fila key={s.nombre} s={s} kprefix="qw" />)}
        </div>
      </div>
    </div>
  );
}

export function AnalisisCB({ analisis }: { analisis: AnalisisData }) {
  const { global, evolucion, dims } = analisis;
  const enObjetivo = global.pctCB >= OBJETIVO;
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setAbiertos((prev) => {
    const n = new Set(prev);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });

  const focoCruzado = [
    ...debajo(dims.categoria).map((s) => ({ ...s, dim: "Categoría" })),
    ...debajo(dims.tipologia).map((s) => ({ ...s, dim: "Tipología" })),
    ...debajo(dims.gerencia).map((s) => ({ ...s, dim: "Gerencia" })),
  ].sort((a, b) => b.faltan80 - a.faltan80).slice(0, 5);

  const TrendIcon = evolucion.deltaMes == null ? Minus : evolucion.deltaMes > 0 ? TrendingUp : evolucion.deltaMes < 0 ? TrendingDown : Minus;
  const trendColor = evolucion.deltaMes == null ? "text-slate-400" : evolucion.deltaMes > 0 ? "text-emerald-600" : evolucion.deltaMes < 0 ? "text-rose-600" : "text-slate-400";

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Foto global + evolución */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`rounded-lg p-5 text-white ${enObjetivo ? "bg-emerald-700" : "bg-[#0a1849]"}`}>
          <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80 flex items-center gap-1.5"><Target className="w-4 h-4" /> Cumplimiento global CB</div>
          <div className="mt-1 text-4xl font-bold">{global.pctCB}%</div>
          {enObjetivo ? (
            <div className="mt-2 text-sm">✓ En objetivo (≥{OBJETIVO}%). Mantener y consolidar.</div>
          ) : (
            <div className="mt-2 text-sm">
              Faltan <strong>{Math.abs(global.brechaPp)} pp</strong> para el {OBJETIVO}% → hay que recuperar <strong>{fmtSku(global.faltan80)}</strong> ({global.cumplidosCB}/{global.totalCB} cumplidos).
            </div>
          )}
        </div>

        <div className="lg:col-span-2 rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /> Evolución</div>
          {evolucion.ultimo == null ? (
            <p className="mt-2 text-sm text-slate-500">Sin serie mensual suficiente.</p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className={`flex items-center gap-2 ${trendColor}`}>
                <TrendIcon className="w-5 h-5" />
                <span className="text-2xl font-bold">{evolucion.ultimo}%</span>
                <span className="text-sm">último mes</span>
              </div>
              <div className="text-sm text-slate-600">
                {evolucion.deltaMes != null && (
                  <span className={evolucion.deltaMes >= 0 ? "text-emerald-600" : "text-rose-600"}>
                    {evolucion.deltaMes >= 0 ? "+" : ""}{evolucion.deltaMes} pp vs mes anterior
                  </span>
                )}
                {evolucion.deltaDesdeInicio != null && evolucion.primerMes && (
                  <span className="text-slate-500"> · {evolucion.deltaDesdeInicio >= 0 ? "+" : ""}{evolucion.deltaDesdeInicio} pp desde {evolucion.primerMes}</span>
                )}
              </div>
              <div className="text-sm">
                {evolucion.deltaDesdeInicio != null && (
                  evolucion.deltaDesdeInicio > 2 ? <span className="text-emerald-700 font-medium">Tendencia de mejora 📈</span>
                  : evolucion.deltaDesdeInicio < -2 ? <span className="text-rose-700 font-medium">Tendencia a la baja 📉</span>
                  : <span className="text-slate-500 font-medium">Estable, sin avance hacia el objetivo</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === Análisis de los 4 gráficos === */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-1">📊 Dónde está la brecha (Categoría · Tipología · Gerencia)</h3>
        <p className="text-xs text-slate-500 mb-3">Segmentos por debajo del 80%, ordenados por <strong>SKUs a recuperar</strong> (mayor impacto primero). Tocá una fila para ver de qué SKUs se trata.</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DimCard titulo="Por Categoría" icon={<BarChart3 className="w-4 h-4 text-blue-600" />} segs={dims.categoria} prefix="cat" abiertos={abiertos} toggle={toggle} />
          <DimCard titulo="Por Tipología" icon={<BarChart3 className="w-4 h-4 text-violet-600" />} segs={dims.tipologia} prefix="tip" abiertos={abiertos} toggle={toggle} />
          <DimCard titulo="Por Gerencia" icon={<Building2 className="w-4 h-4 text-blue-600" />} segs={dims.gerencia} prefix="ger" abiertos={abiertos} toggle={toggle} />
        </div>
      </div>

      {/* Foco prioritario cruzado */}
      {focoCruzado.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h4 className="text-sm font-bold text-amber-900">Foco prioritario para llegar al 80%</h4>
          </div>
          <p className="text-xs text-amber-800 mb-3">Los segmentos que más mueven la aguja (cruzando Categoría, Tipología y Gerencia). Atacar estos primero — tocá para ver los SKUs:</p>
          <div className="space-y-1">
            {focoCruzado.map((s, i) => {
              const k = `foco:${s.dim}:${s.nombre}`;
              const open = abiertos.has(k);
              return (
                <div key={`${s.dim}-${s.nombre}`}>
                  <button onClick={() => toggle(k)} className="w-full flex items-center gap-3 text-xs bg-white rounded p-2 text-left hover:bg-amber-100/40">
                    {open ? <ChevronDown className="w-3 h-3 text-amber-500 shrink-0" /> : <ChevronRight className="w-3 h-3 text-amber-500 shrink-0" />}
                    <span className="w-5 h-5 shrink-0 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px]">{i + 1}</span>
                    <span className="text-[10px] uppercase tracking-wide text-slate-400 w-16 shrink-0">{s.dim}</span>
                    <span className="flex-1 font-medium text-slate-800 truncate">{s.nombre}</span>
                    <span className={`px-1.5 py-0.5 rounded font-semibold ${pctBg(s.pctCB)}`}>{s.pctCB}%</span>
                    <span className="text-rose-600 tabular-nums w-12 text-right">{s.pctCB - OBJETIVO} pp</span>
                    <span className="text-slate-700 tabular-nums w-28 text-right">recuperar {fmtSku(s.faltan80)}</span>
                  </button>
                  {open && <SkusDetalle skus={s.skusFaltantes} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === Análisis de las 2 tablas === */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">👥 Análisis por Vendedor y por Cliente</h3>
        <div className="space-y-4">
          <TablaAnalisis titulo="Por Vendedor" icon={<Trophy className="w-4 h-4 text-amber-500" />} columna="Vendedor" segs={dims.vendedor} prefix="vend" abiertos={abiertos} toggle={toggle} />
          <TablaAnalisis titulo="Por Cliente / Cadena" icon={<Users className="w-4 h-4 text-blue-600" />} columna="Cliente" segs={dims.cliente} prefix="cli" abiertos={abiertos} toggle={toggle} />
        </div>
      </div>
    </div>
  );
}
