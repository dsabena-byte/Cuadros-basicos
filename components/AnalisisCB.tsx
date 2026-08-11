"use client";

import { TrendingUp, TrendingDown, Minus, Target, AlertTriangle, Trophy, Building2, BarChart3, Users } from "lucide-react";

const OBJETIVO = 80;

export type SegAnalisis = {
  nombre: string;
  pctCB: number;
  totalCB: number;
  cumplidosCB: number;
  faltan80: number; // SKUs a recuperar en el segmento para llegar al 80%
  extra?: string;    // dato de contexto (ej. gerente del vendedor)
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

// Segmentos por debajo del objetivo, ordenados por oportunidad (SKUs a recuperar).
function debajo(segs: SegAnalisis[]): SegAnalisis[] {
  return segs.filter((s) => s.pctCB < OBJETIVO && s.faltan80 > 0).sort((a, b) => b.faltan80 - a.faltan80);
}

// Card de una dimensión (Categoría / Tipología / Gerencia): diagnóstico + segmentos a mejorar.
function DimCard({ titulo, icon, segs }: { titulo: string; icon: React.ReactNode; segs: SegAnalisis[] }) {
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
            {bajo.length} de {segs.length} por debajo del objetivo. El foco: <strong className="text-rose-700">{bajo[0].nombre}</strong> ({bajo[0].pctCB}%, faltan {fmtSku(bajo[0].faltan80)} para el 80%).
          </p>
          <div className="space-y-1.5">
            {bajo.map((s) => (
              <div key={s.nombre} className="flex items-center gap-2 text-xs">
                <span className="w-40 shrink-0 truncate text-slate-700" title={s.nombre}>{s.nombre}</span>
                <div className="flex-1 h-2 rounded bg-slate-100 overflow-hidden">
                  <div className="h-2 rounded bg-rose-400" style={{ width: `${Math.min(100, s.pctCB)}%` }} />
                </div>
                <span className={`w-10 text-right tabular-nums font-semibold ${pctColor(s.pctCB)}`}>{s.pctCB}%</span>
                <span className="w-14 text-right tabular-nums text-rose-600">{s.pctCB - OBJETIVO} pp</span>
                <span className="w-24 text-right tabular-nums text-slate-500">recuperar {s.faltan80}</span>
              </div>
            ))}
          </div>
          {enObjetivo.length > 0 && (
            <p className="text-[11px] text-emerald-600 mt-2">En objetivo: {enObjetivo.map((s) => `${s.nombre} (${s.pctCB}%)`).join(" · ")}</p>
          )}
        </>
      )}
    </div>
  );
}

// Bloque de análisis de una tabla (Vendedor / Cliente): peores + quick wins.
function TablaAnalisis({ titulo, icon, columna, segs }: { titulo: string; icon: React.ReactNode; columna: string; segs: SegAnalisis[] }) {
  const bajo = debajo(segs);
  const quickWins = bajo.filter((s) => s.pctCB >= 70).slice(0, 5); // cerca del objetivo (empujables)
  const focos = bajo.slice(0, 8); // mayor cantidad de SKUs a recuperar
  const enObj = segs.filter((s) => s.pctCB >= OBJETIVO).length;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="text-sm font-bold text-slate-900">{titulo}</h4>
      </div>
      <p className="text-xs text-slate-600 mb-3">
        {enObj} de {segs.length} en objetivo · <strong className="text-rose-700">{bajo.length}</strong> por debajo del 80%.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-rose-600 mb-1.5">🎯 Mayor impacto (más SKUs a recuperar)</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                <th className="text-left font-medium py-1">{columna}</th>
                <th className="text-right font-medium">% CB</th>
                <th className="text-right font-medium">Brecha</th>
                <th className="text-right font-medium">Recuperar</th>
              </tr>
            </thead>
            <tbody>
              {focos.map((s) => (
                <tr key={s.nombre} className="border-t border-slate-100">
                  <td className="py-1 pr-2 truncate max-w-[140px]" title={s.nombre}>{s.nombre}{s.extra ? <span className="text-slate-400"> · {s.extra}</span> : null}</td>
                  <td className={`py-1 text-right tabular-nums font-semibold ${pctColor(s.pctCB)}`}>{s.pctCB}%</td>
                  <td className="py-1 text-right tabular-nums text-rose-600">{s.pctCB - OBJETIVO} pp</td>
                  <td className="py-1 text-right tabular-nums text-slate-700 font-medium">{s.faltan80}</td>
                </tr>
              ))}
              {focos.length === 0 && <tr><td colSpan={4} className="py-2 text-center text-emerald-600">Todos en objetivo 🎉</td></tr>}
            </tbody>
          </table>
        </div>

        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 mb-1.5">⚡ Quick wins (a un paso del 80%)</div>
          {quickWins.length === 0 ? (
            <p className="text-xs text-slate-500 py-1">No hay segmentos entre 70% y 80% — los que faltan están más lejos.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                  <th className="text-left font-medium py-1">{columna}</th>
                  <th className="text-right font-medium">% CB</th>
                  <th className="text-right font-medium">Recuperar</th>
                </tr>
              </thead>
              <tbody>
                {quickWins.map((s) => (
                  <tr key={s.nombre} className="border-t border-slate-100">
                    <td className="py-1 pr-2 truncate max-w-[150px]" title={s.nombre}>{s.nombre}</td>
                    <td className="py-1 text-right tabular-nums font-semibold text-amber-600">{s.pctCB}%</td>
                    <td className="py-1 text-right tabular-nums text-slate-700 font-medium">{s.faltan80}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export function AnalisisCB({ analisis }: { analisis: AnalisisData }) {
  const { global, evolucion, dims } = analisis;
  const enObjetivo = global.pctCB >= OBJETIVO;

  // Foco prioritario cruzando las 3 dimensiones de los gráficos.
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
              Faltan <strong>{Math.abs(global.brechaPp)} pp</strong> para el {OBJETIVO}% →{" "}
              hay que recuperar <strong>{fmtSku(global.faltan80)}</strong> ({global.cumplidosCB}/{global.totalCB} cumplidos).
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
        <p className="text-xs text-slate-500 mb-3">Segmentos por debajo del 80%, ordenados por <strong>SKUs a recuperar</strong> (mayor impacto en el número global primero).</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DimCard titulo="Por Categoría" icon={<BarChart3 className="w-4 h-4 text-blue-600" />} segs={dims.categoria} />
          <DimCard titulo="Por Tipología" icon={<BarChart3 className="w-4 h-4 text-violet-600" />} segs={dims.tipologia} />
          <DimCard titulo="Por Gerencia" icon={<Building2 className="w-4 h-4 text-blue-600" />} segs={dims.gerencia} />
        </div>
      </div>

      {/* Foco prioritario cruzado */}
      {focoCruzado.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h4 className="text-sm font-bold text-amber-900">Foco prioritario para llegar al 80%</h4>
          </div>
          <p className="text-xs text-amber-800 mb-3">Los segmentos que más mueven la aguja (cruzando Categoría, Tipología y Gerencia). Atacar estos primero:</p>
          <div className="space-y-1.5">
            {focoCruzado.map((s, i) => (
              <div key={`${s.dim}-${s.nombre}`} className="flex items-center gap-3 text-xs bg-white rounded p-2">
                <span className="w-5 h-5 shrink-0 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px]">{i + 1}</span>
                <span className="text-[10px] uppercase tracking-wide text-slate-400 w-16 shrink-0">{s.dim}</span>
                <span className="flex-1 font-medium text-slate-800 truncate">{s.nombre}</span>
                <span className={`px-1.5 py-0.5 rounded font-semibold ${pctBg(s.pctCB)}`}>{s.pctCB}%</span>
                <span className="text-rose-600 tabular-nums w-12 text-right">{s.pctCB - OBJETIVO} pp</span>
                <span className="text-slate-700 tabular-nums w-28 text-right">recuperar {fmtSku(s.faltan80)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === Análisis de las 2 tablas === */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">👥 Análisis por Vendedor y por Cliente</h3>
        <div className="space-y-4">
          <TablaAnalisis titulo="Por Vendedor" icon={<Trophy className="w-4 h-4 text-amber-500" />} columna="Vendedor" segs={dims.vendedor} />
          <TablaAnalisis titulo="Por Cliente / Cadena" icon={<Users className="w-4 h-4 text-blue-600" />} columna="Cliente" segs={dims.cliente} />
        </div>
      </div>
    </div>
  );
}
