"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ChevronDown, TrendingUp, Info } from "lucide-react";
import type { AnalisisTrade, NodoTrade, CategoriaAnalisis, Cuadrante } from "@/lib/analisis-trade";
import { CB_OBJETIVO } from "@/lib/analisis-trade";

const CUAD: Record<Cuadrante, { label: string; badge: string; dot: string }> = {
  surtido:   { label: "Falta surtido",     badge: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  ejecucion: { label: "Ejecución góndola", badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  sostener:  { label: "Sostener",          badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  fragil:    { label: "Frágil",            badge: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  sinFS:     { label: "Sin FS",            badge: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400" },
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Desvío en pp: verde si cumple (>=0), rojo si está por debajo.
function Desvio({ v }: { v: number | null }) {
  if (v == null) return <span className="text-slate-400">s/FS</span>;
  const cls = v >= 0 ? "text-emerald-600" : "text-rose-600";
  return <span className={`tabular-nums font-semibold ${cls}`}>{v >= 0 ? "+" : ""}{v} pp</span>;
}

function SkusList({ n }: { n: NodoTrade }) {
  if (n.faltantes.length === 0) return <div className="text-[11px] text-emerald-600 px-2 py-1.5">✓ No faltan SKUs de CB en esta tienda.</div>;
  const orden = [...n.faltantes].sort((a, b) => a.tipo.localeCompare(b.tipo) || a.sku.localeCompare(b.sku));
  return (
    <div className="mt-1 rounded border border-slate-200 bg-white max-h-52 overflow-auto">
      <div className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 px-2 py-1 border-b border-slate-200">
        {n.faltantes.length} SKUs del CB a reponer ({n.faltanInf} INF · {n.faltanEst} EST)
      </div>
      <table className="w-full text-[11px]">
        <tbody>
          {orden.map((s, i) => (
            <tr key={`${s.sku}-${i}`} className="border-t border-slate-100 first:border-t-0">
              <td className="px-2 py-1 font-mono text-slate-800 whitespace-nowrap">{s.sku}</td>
              <td className="px-2 py-1 text-right whitespace-nowrap">
                <span className={`px-1 rounded text-[10px] font-medium ${s.tipo === "Infaltable" ? "bg-violet-100 text-violet-700" : "bg-pink-100 text-pink-700"}`}>
                  {s.tipo === "Infaltable" ? "INF" : "EST"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Fila de tienda (dentro de un cliente): expande a los SKUs faltantes.
function FilaTienda({ n }: { n: NodoTrade }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-slate-100">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 text-[11px] py-1 px-2 hover:bg-white text-left">
        {open ? <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${CUAD[n.cuadrante].dot}`} />
        <span className="flex-1 truncate text-slate-700" title={n.nombre}>{n.nombre}</span>
        <span className="w-24 text-right">CB {n.pctCB}% <Desvio v={n.desvCB} /></span>
        <span className="w-24 text-right">{n.fsShare == null ? <span className="text-slate-400">FS s/d</span> : <>FS {n.fsShare}% </>}<Desvio v={n.desvFS} /></span>
        <span className="w-16 text-right tabular-nums text-slate-500">{n.faltantes.length} faltan</span>
        <span className="w-24 text-right tabular-nums">{n.upliftPp != null && n.upliftPp > 0 ? <span className="text-emerald-700 font-semibold">+{n.upliftPp} pp</span> : "—"}</span>
      </button>
      {open && <div className="px-3 pb-2"><SkusList n={n} /></div>}
    </div>
  );
}

// Fila de cliente/cadena: expande a sus tiendas.
function FilaCliente({ n }: { n: NodoTrade }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-2 text-xs py-2 px-2 hover:bg-slate-50 text-left">
        {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
        <span className="flex-1 min-w-0">
          <span className="font-medium text-slate-800 truncate block" title={n.nombre}>{n.nombre}</span>
          <span className="text-[10px] text-slate-400">{n.tiendas?.length ?? 0} {(n.tiendas?.length ?? 0) === 1 ? "tienda" : "tiendas"}</span>
        </span>
        <span className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] ${CUAD[n.cuadrante].badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${CUAD[n.cuadrante].dot}`} />{CUAD[n.cuadrante].label}
        </span>
        <span className="w-24 text-right">CB {n.pctCB}% <Desvio v={n.desvCB} /></span>
        <span className="w-24 text-right">{n.fsShare == null ? <span className="text-slate-400">FS s/d</span> : <>FS {n.fsShare}% </>}<Desvio v={n.desvFS} /></span>
        <span className="w-16 text-right tabular-nums text-slate-600">{n.faltanInf}I·{n.faltanEst}E</span>
        <span className="w-28 text-right tabular-nums">
          {n.upliftPp != null && n.upliftPp > 0
            ? <span className="text-emerald-700 font-semibold">+{n.upliftPp} pp → {n.fsProyectado}%</span>
            : <span className="text-slate-400">{n.faltantes.length} faltan</span>}
        </span>
      </button>
      {open && (
        <div className="px-2 pb-2 bg-slate-50/60">
          <div className="text-[10px] uppercase tracking-wide text-slate-400 px-2 py-1">Tiendas · tocá una para ver los SKUs a reponer</div>
          <div className="rounded border border-slate-200 bg-white">
            {(n.tiendas ?? []).map((t) => <FilaTienda key={t.storeNumber || t.nombre} n={t} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoriaCard({ c, activa, onClick }: { c: CategoriaAnalisis; activa: boolean; onClick: () => void }) {
  const cbOk = c.desvCB >= 0;
  const fsOk = c.desvFS != null && c.desvFS >= 0;
  return (
    <button onClick={onClick} className={`text-left rounded-lg border p-3 transition ${activa ? "border-blue-500 ring-2 ring-blue-200 bg-white" : "border-slate-200 bg-white hover:border-slate-300"}`}>
      <div className="text-sm font-bold text-slate-900">{capitalize(c.categoria)}</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Cuadro Básico</div>
          <div className="flex items-baseline gap-1">
            <span className={`text-lg font-bold ${cbOk ? "text-emerald-600" : "text-rose-600"}`}>{c.pctCB}%</span>
            <Desvio v={c.desvCB} />
          </div>
          <div className="text-[10px] text-slate-400">obj {CB_OBJETIVO}%</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Floor Share</div>
          <div className="flex items-baseline gap-1">
            <span className={`text-lg font-bold ${fsOk ? "text-emerald-600" : "text-rose-600"}`}>{c.fsShare == null ? "s/d" : `${c.fsShare}%`}</span>
            <Desvio v={c.desvFS} />
          </div>
          <div className="text-[10px] text-slate-400">obj {c.objetivoFS ?? "—"}%</div>
        </div>
      </div>
    </button>
  );
}

export function AnalisisTradeView({ analisis }: { analisis: AnalisisTrade }) {
  const { categorias, cobertura } = analisis;
  // Default: la categoría con mayor déficit de Floor Share (mayor oportunidad).
  const peor = useMemo(() => {
    let best = categorias[0]?.categoria;
    let worst = Infinity;
    for (const c of categorias) {
      const d = c.desvFS ?? 999;
      if (d < worst) { worst = d; best = c.categoria; }
    }
    return best;
  }, [categorias]);
  const [sel, setSel] = useState<string | undefined>(peor);
  const cat = categorias.find((c) => c.categoria === sel) ?? categorias[0];

  if (!cat) return <div className="text-sm text-slate-500">Sin datos para analizar.</div>;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Leyenda */}
      <div className="flex items-start gap-2 text-xs text-slate-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <strong>Cómo leerlo:</strong> el análisis es <strong>por categoría</strong> (nunca promediado). <strong>Desv. CB</strong> = %CB − {CB_OBJETIVO}% (¿la tienda tiene los SKUs del cuadro básico?). <strong>Desv. FS</strong> = share − objetivo de góndola de la categoría (¿cuánta góndola ocupa Drean?). <strong>INF</strong> = Infaltable · <strong>EST</strong> = Estratégico. Los SKUs listados son los que <strong>faltan</strong> en la tienda (a reponer); reponerlos es lo que sube el Floor Share.
        </div>
      </div>

      {/* Cards por categoría (y selector) */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-2">Desvíos por categoría <span className="font-normal text-slate-400 text-xs">— tocá una para ver el detalle</span></h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {categorias.map((c) => <CategoriaCard key={c.categoria} c={c} activa={c.categoria === cat.categoria} onClick={() => setSel(c.categoria)} />)}
        </div>
      </div>

      {/* Detalle de la categoría seleccionada */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">{capitalize(cat.categoria)} — oportunidades por cliente</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          {cat.nTiendas} tiendas · CB {cat.pctCB}% (<Desvio v={cat.desvCB} />) · FS {cat.fsShare == null ? "s/d" : `${cat.fsShare}%`} (<Desvio v={cat.desvFS} />) · {cat.faltanTotal} SKUs faltantes en total.
          Ordenado por <strong>uplift de FS al reponer los SKUs de CB faltantes</strong>. Tocá un cliente → tienda → SKUs.
        </p>

        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
          {/* encabezado de columnas */}
          <div className="hidden sm:flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-400 px-2 py-1.5">
            <span className="w-3.5" />
            <span className="flex-1">Cliente / Cadena</span>
            <span className="w-[104px]" />
            <span className="w-24 text-right">Cuadro Básico</span>
            <span className="w-24 text-right">Floor Share</span>
            <span className="w-16 text-right">Faltan</span>
            <span className="w-28 text-right">Uplift FS</span>
          </div>
          {cat.clientes.map((n) => <FilaCliente key={n.nombre} n={n} />)}
          {cat.clientes.length === 0 && <div className="p-4 text-sm text-slate-500">Sin clientes en esta categoría.</div>}
        </div>
      </div>

      <p className="text-[11px] text-slate-400">
        Cobertura: {cobertura.tiendasCB} tiendas del CB · {cobertura.tiendasAmbas} con Floor Share medido · {cobertura.tiendasFS} con FS relevado en total.
        El uplift es una estimación (FS es por marca, no por SKU) calibrada con las unidades por SKU de cada segmento.
      </p>
    </div>
  );
}
