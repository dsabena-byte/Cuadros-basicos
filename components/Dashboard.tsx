"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LabelList, Legend, LineChart, Line,
} from "recharts";
import {
  AlertTriangle, Trophy, Building2, BarChart3, ChevronUp, ChevronDown, Minus,
  RotateCcw, Users, Target, FileText, CheckCircle2, Clock, XCircle, TrendingUp,
} from "lucide-react";
import type {
  CuadroBasicoItem, ClasificacionCliente, VentaRow, VentasFile,
} from "@/lib/types";

const OBJETIVO = 80;

const MESES = [
  { num: 1, label: "Enero" }, { num: 2, label: "Febrero" }, { num: 3, label: "Marzo" },
  { num: 4, label: "Abril" }, { num: 5, label: "Mayo" }, { num: 6, label: "Junio" },
  { num: 7, label: "Julio" }, { num: 8, label: "Agosto" }, { num: 9, label: "Septiembre" },
  { num: 10, label: "Octubre" }, { num: 11, label: "Noviembre" }, { num: 12, label: "Diciembre" },
];

const formatFecha = (f?: string | null) => {
  if (!f) return "—";
  const [y, m, d] = f.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};

const getEstado = (fc: number, bo: number) =>
  fc > 0 ? "FACTURADO" : bo > 0 ? "BACKORDER" : "PENDIENTE";

type Props = {
  cuadroBasico: CuadroBasicoItem[];
  clasificacion: ClasificacionCliente[];
  ventas: VentasFile;
};

type Filters = {
  mes: string[];
  categoria: string;
  gerente: string;
  vendedor: string;
  tipologia: string;
  cliente: string;
};

export default function Dashboard({ cuadroBasico, clasificacion, ventas }: Props) {
  const vendedorPorCliente = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clasificacion) m.set(c.cliente, c.vendedor);
    return m;
  }, [clasificacion]);

  const gerentePorVendedor = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clasificacion) m.set(c.vendedor, c.gerente);
    return m;
  }, [clasificacion]);

  const VENDEDORES = useMemo(
    () => [...new Set(clasificacion.map((c) => c.vendedor))],
    [clasificacion],
  );
  const GERENTES = useMemo(
    () => [...new Set(clasificacion.map((c) => c.gerente))],
    [clasificacion],
  );
  const CLIENTES_UNICOS = useMemo(
    () => [...new Set(cuadroBasico.map((c) => c.cliente))],
    [cuadroBasico],
  );

  const [filters, setFilters] = useState<Filters>({
    mes: [], categoria: "TODAS", gerente: "TODOS",
    vendedor: "TODOS", tipologia: "TODAS", cliente: "TODOS",
  });
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string | null>(null);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    const next = { ...filters, [key]: value };
    if (key === "gerente") next.vendedor = "TODOS";
    if (key === "tipologia") next.cliente = "TODOS";
    setFilters(next);
  };
  const limpiarFiltros = () =>
    setFilters({ mes: [], categoria: "TODAS", gerente: "TODOS", vendedor: "TODOS", tipologia: "TODAS", cliente: "TODOS" });

  const vendedoresDisponibles = useMemo(
    () => filters.gerente === "TODOS"
      ? VENDEDORES
      : VENDEDORES.filter((v) => gerentePorVendedor.get(v) === filters.gerente),
    [filters.gerente, VENDEDORES, gerentePorVendedor],
  );

  const clientesDisponibles = useMemo(
    () => filters.tipologia === "TODAS"
      ? CLIENTES_UNICOS
      : [...new Set(cuadroBasico.filter((c) => c.tipologia === filters.tipologia).map((c) => c.cliente))],
    [filters.tipologia, CLIENTES_UNICOS, cuadroBasico],
  );

  const comprasFiltradas = useMemo(() => {
    const mesesSel = new Set(filters.mes.map(Number));
    return ventas.rows.filter((c) => {
      if (mesesSel.size > 0 && !mesesSel.has(c.mes)) return false;
      if (filters.vendedor !== "TODOS" && c.vendedor !== filters.vendedor) return false;
      return true;
    });
  }, [ventas.rows, filters.mes, filters.vendedor]);

  const cbFiltrado = useMemo(
    () =>
      cuadroBasico.filter((item) => {
        if (filters.categoria !== "TODAS" && item.categoria !== filters.categoria) return false;
        if (filters.tipologia !== "TODAS" && item.tipologia !== filters.tipologia) return false;
        if (filters.cliente !== "TODOS" && item.cliente !== filters.cliente) return false;
        const v = vendedorPorCliente.get(item.cliente);
        if (filters.vendedor !== "TODOS" && v !== filters.vendedor) return false;
        if (filters.gerente !== "TODOS" && (v ? gerentePorVendedor.get(v) : undefined) !== filters.gerente) return false;
        return true;
      }),
    [cuadroBasico, filters, vendedorPorCliente, gerentePorVendedor],
  );

  const calcularPorcentajes = (items: CuadroBasicoItem[]) => {
    const cumplido = (item: CuadroBasicoItem) =>
      comprasFiltradas.some((c) => c.cliente === item.cliente && c.sku === item.sku);
    const totalCB = items.length;
    const cumplidosCB = items.filter(cumplido).length;
    const inf = items.filter((i) => i.tipo === "INFALTABLE");
    const est = items.filter((i) => i.tipo === "ESTRATEGICO");
    const cumplidosInf = inf.filter(cumplido).length;
    const cumplidosEst = est.filter(cumplido).length;
    return {
      pctCB: totalCB > 0 ? Math.round((cumplidosCB / totalCB) * 100) : 0,
      pctInf: inf.length > 0 ? Math.round((cumplidosInf / inf.length) * 100) : 0,
      pctEst: est.length > 0 ? Math.round((cumplidosEst / est.length) * 100) : 0,
      totalCB, cumplidosCB,
      totalInf: inf.length, cumplidosInf,
      totalEst: est.length, cumplidosEst,
    };
  };

  const cumplPorVendedor = useMemo(() => {
    const vs = [...new Set(cbFiltrado.map((c) => vendedorPorCliente.get(c.cliente)).filter(Boolean) as string[])];
    return vs
      .map((v) => {
        const itemsVend = cbFiltrado.filter((c) => vendedorPorCliente.get(c.cliente) === v);
        return { nombre: v, gerente: gerentePorVendedor.get(v) ?? "", ...calcularPorcentajes(itemsVend) };
      })
      .sort((a, b) => b.pctCB - a.pctCB);
  }, [cbFiltrado, comprasFiltradas]);

  const cumplPorCliente = useMemo(() => {
    const cs = [...new Set(cbFiltrado.map((c) => c.cliente))];
    return cs
      .map((cli) => {
        const itemsCli = cbFiltrado.filter((c) => c.cliente === cli);
        return {
          nombre: cli,
          tipologia: itemsCli[0]?.tipologia,
          vendedor: vendedorPorCliente.get(cli) ?? "",
          ...calcularPorcentajes(itemsCli),
        };
      })
      .sort((a, b) => b.pctCB - a.pctCB);
  }, [cbFiltrado, comprasFiltradas]);

  const cumplPorCategoria = useMemo(() => {
    const cats: Array<"LAVADO" | "REFRIGERACION" | "COCCION"> = [
      "LAVADO", "REFRIGERACION", "COCCION",
    ];
    return cats.map((cat) => {
      const items = cbFiltrado.filter((c) => c.categoria === cat);
      const p = calcularPorcentajes(items);
      return { categoria: cat, "% CB": p.pctCB, "% Infaltables": p.pctInf, "% Estratégico": p.pctEst };
    });
  }, [cbFiltrado, comprasFiltradas]);

  const evolucionMensual = useMemo(() => {
    const mesActual = new Date(ventas.generatedAt).getMonth() + 1;
    const mesesActivos = MESES.filter((m) => m.num <= mesActual);
    return mesesActivos.map((m) => {
      const comprasHastaMes = ventas.rows.filter((c) => {
        if (c.mes > m.num) return false;
        if (filters.vendedor !== "TODOS" && c.vendedor !== filters.vendedor) return false;
        return true;
      });
      const cumplido = (item: CuadroBasicoItem) =>
        comprasHastaMes.some((c) => c.cliente === item.cliente && c.sku === item.sku);
      const totalCB = cbFiltrado.length;
      const cumplidosCB = cbFiltrado.filter(cumplido).length;
      const inf = cbFiltrado.filter((i) => i.tipo === "INFALTABLE");
      const est = cbFiltrado.filter((i) => i.tipo === "ESTRATEGICO");
      return {
        mes: m.label.slice(0, 3),
        "% CB": totalCB > 0 ? Math.round((cumplidosCB / totalCB) * 100) : 0,
        "% Infaltables": inf.length > 0 ? Math.round((inf.filter(cumplido).length / inf.length) * 100) : 0,
        "% Estratégico": est.length > 0 ? Math.round((est.filter(cumplido).length / est.length) * 100) : 0,
      };
    });
  }, [cbFiltrado, filters.vendedor, ventas]);

  const kpisGlobales = useMemo(() => {
    const p = calcularPorcentajes(cbFiltrado);
    return {
      ...p,
      cantClientes: [...new Set(cbFiltrado.map((c) => c.cliente))].length,
      cantVendedores: [...new Set(cbFiltrado.map((c) => vendedorPorCliente.get(c.cliente)).filter(Boolean))].length,
    };
  }, [cbFiltrado, comprasFiltradas, vendedorPorCliente]);

  // Una fila por (sku, tipo). Para cada SKU agregamos a través de todos
  // los clientes filtrados: unidades FC, BO, y % cumplimiento (clientes
  // con al menos 1 unidad / clientes que tienen el SKU en su CB).
  type FilaSKU = {
    sku: string;
    categoria: string;
    tipo: "INFALTABLE" | "ESTRATEGICO";
    clientesEnCB: number;
    clientesCumplidos: number;
    fcUnits: number;
    boUnits: number;
    pct: number;
  };
  const skusDetalle = useMemo<FilaSKU[]>(() => {
    const byKey = new Map<string, FilaSKU>();
    for (const item of cbFiltrado) {
      const key = `${item.sku}|${item.tipo}`;
      let row = byKey.get(key);
      if (!row) {
        row = {
          sku: item.sku,
          categoria: item.categoria,
          tipo: item.tipo,
          clientesEnCB: 0,
          clientesCumplidos: 0,
          fcUnits: 0,
          boUnits: 0,
          pct: 0,
        };
        byKey.set(key, row);
      }
      row.clientesEnCB += 1;
      const compras = comprasFiltradas.filter(
        (c) => c.cliente === item.cliente && c.sku === item.sku,
      );
      const fc = compras.filter((c) => c.tipo === "FC").reduce((a, c) => a + c.unidades, 0);
      const bo = compras.filter((c) => c.tipo === "BO").reduce((a, c) => a + c.unidades, 0);
      row.fcUnits += fc;
      row.boUnits += bo;
      if (fc + bo > 0) row.clientesCumplidos += 1;
    }
    return [...byKey.values()]
      .map((r) => ({ ...r, pct: r.clientesEnCB > 0 ? Math.round((r.clientesCumplidos / r.clientesEnCB) * 100) : 0 }))
      .sort((a, b) => {
        // Infaltables primero, después por categoría, después alfabético por SKU
        if (a.tipo !== b.tipo) return a.tipo === "INFALTABLE" ? -1 : 1;
        if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
        return a.sku.localeCompare(b.sku);
      });
  }, [cbFiltrado, comprasFiltradas]);

  const detalleSKUs = useMemo(() => {
    if (!clienteSeleccionado) return [];
    return cbFiltrado
      .filter((c) => c.cliente === clienteSeleccionado)
      .map((item) => {
        const compras = comprasFiltradas.filter(
          (c) => c.cliente === clienteSeleccionado && c.sku === item.sku,
        );
        const fc = compras.filter((c) => c.tipo === "FC").reduce((a, c) => a + c.unidades, 0);
        const bo = compras.filter((c) => c.tipo === "BO").reduce((a, c) => a + c.unidades, 0);
        const ult = compras.map((c) => c.fecha).sort().pop();
        return { ...item, fcUnits: fc, boUnits: bo, estado: getEstado(fc, bo), ultimaActualizacion: ult };
      });
  }, [clienteSeleccionado, cbFiltrado, comprasFiltradas]);

  const filtrosActivos =
    (filters.mes.length > 0 ? 1 : 0) +
    (filters.categoria !== "TODAS" ? 1 : 0) +
    (filters.gerente !== "TODOS" ? 1 : 0) +
    (filters.vendedor !== "TODOS" ? 1 : 0) +
    (filters.tipologia !== "TODAS" ? 1 : 0) +
    (filters.cliente !== "TODOS" ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-[1600px] mx-auto">
          <h1 className="text-2xl font-bold text-slate-900">Cumplimiento Cuadro Básico</h1>
          <p className="text-sm text-slate-500">
            Drean Argentina · Última sincronización: {new Date(ventas.generatedAt).toLocaleString("es-AR")} ·
            Fuente: {ventas.source} · Objetivo: {OBJETIVO}%
          </p>
        </div>
      </div>

      <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-wrap gap-2 items-end">
            <MultiSelectDropdown
              label="MES"
              values={filters.mes}
              onChange={(v) => updateFilter("mes", v)}
              options={MESES.map((m) => ({ v: String(m.num), l: m.label }))}
              placeholder="Todos"
            />
            <FilterDropdown label="CATEGORÍA" value={filters.categoria} onChange={(v) => updateFilter("categoria", v)} options={[
              { v: "TODAS", l: "Todas" }, { v: "LAVADO", l: "Lavado" },
              { v: "REFRIGERACION", l: "Refrigeración" }, { v: "COCCION", l: "Cocción" },
            ]} />
            <FilterDropdown label="GERENTE" value={filters.gerente} onChange={(v) => updateFilter("gerente", v)} options={[{ v: "TODOS", l: "Todos" }, ...GERENTES.map((g) => ({ v: g, l: g }))]} />
            <FilterDropdown label="VENDEDOR" value={filters.vendedor} onChange={(v) => updateFilter("vendedor", v)} options={[{ v: "TODOS", l: "Todos" }, ...vendedoresDisponibles.map((v) => ({ v, l: v }))]} />
            <FilterDropdown label="TIPOLOGÍA" value={filters.tipologia} onChange={(v) => updateFilter("tipologia", v)} options={[
              { v: "TODAS", l: "Todas" }, { v: "TOP 10", l: "Grandes Cuentas Top 10" },
              { v: "GRANDES CUENTAS RESTO", l: "Grandes Cuentas Resto" },
              { v: "HIPERMERCADOS", l: "Hipermercados" }, { v: "SMALL RETAILERS", l: "Small Retailers" },
            ]} />
            <FilterDropdown label="CLIENTE" value={filters.cliente} onChange={(v) => updateFilter("cliente", v)} options={[{ v: "TODOS", l: "Todos" }, ...clientesDisponibles.slice().sort().map((c) => ({ v: c, l: c }))]} wide />
            <button onClick={limpiarFiltros} className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-medium transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Limpiar
            </button>
          </div>
          {filtrosActivos > 0 && (
            <div className="mt-2 text-xs text-slate-500">
              {filtrosActivos} {filtrosActivos === 1 ? "filtro activo" : "filtros activos"} ·{" "}
              {kpisGlobales.cantClientes} {kpisGlobales.cantClientes === 1 ? "cliente" : "clientes"}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {kpisGlobales.totalCB === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h3 className="text-slate-900 font-semibold mb-1">Sin resultados</h3>
            <p className="text-slate-500 text-sm">Probá ajustar los filtros o limpiar para ver todos los datos.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard label="% CB Global" value={`${kpisGlobales.pctCB}%`} subtitle={`${kpisGlobales.cumplidosCB}/${kpisGlobales.totalCB} SKUs`} icon={<Target />} color="blue" pct={kpisGlobales.pctCB} />
              <KpiCard label="% Infaltables" value={`${kpisGlobales.pctInf}%`} subtitle={`${kpisGlobales.cumplidosInf}/${kpisGlobales.totalInf} SKUs`} icon={<CheckCircle2 />} color="violet" pct={kpisGlobales.pctInf} />
              <KpiCard label="% Estratégico" value={`${kpisGlobales.pctEst}%`} subtitle={`${kpisGlobales.cumplidosEst}/${kpisGlobales.totalEst} SKUs`} icon={<BarChart3 />} color="pink" pct={kpisGlobales.pctEst} />
              <KpiCard label="Clientes" value={kpisGlobales.cantClientes} subtitle={`${kpisGlobales.cantVendedores} vendedores`} icon={<Users />} color="slate" />
            </div>

            <Panel title="Evolución mensual" icon={<TrendingUp className="w-4 h-4 text-pink-600" />}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={evolucionMensual} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="% CB" stroke="#2542C2" strokeWidth={2.5} dot={{ r: 4, fill: "#2542C2" }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="% Infaltables" stroke="#A855F7" strokeWidth={2.5} dot={{ r: 4, fill: "#A855F7" }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="% Estratégico" stroke="#EC4899" strokeWidth={2.5} dot={{ r: 4, fill: "#EC4899" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Cumplimiento por Categoría" icon={<BarChart3 className="w-4 h-4 text-blue-600" />}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={cumplPorCategoria} margin={{ top: 30, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="categoria" tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="% CB" fill="#2542C2">
                    <LabelList dataKey="% CB" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fontWeight: 600, fill: "#1e293b" }} />
                  </Bar>
                  <Bar dataKey="% Infaltables" fill="#A855F7">
                    <LabelList dataKey="% Infaltables" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fontWeight: 600, fill: "#1e293b" }} />
                  </Bar>
                  <Bar dataKey="% Estratégico" fill="#EC4899">
                    <LabelList dataKey="% Estratégico" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fontWeight: 600, fill: "#1e293b" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <TablaCumplimiento title="Cumplimiento por Vendedor" icon={<Trophy className="w-4 h-4 text-amber-500" />} columnHeader="Vendedor" rows={cumplPorVendedor} />
              <TablaCumplimiento title="Cumplimiento por Cliente / Cadena" icon={<Building2 className="w-4 h-4 text-blue-600" />} columnHeader="Cliente / Cadena" rows={cumplPorCliente} onRowClick={(cli) => setClienteSeleccionado(cli)} />
            </div>

            {clienteSeleccionado && (
              <Panel title={`Detalle de SKUs · ${clienteSeleccionado}`} icon={<FileText className="w-4 h-4 text-slate-600" />} actionLabel="Cerrar" onAction={() => setClienteSeleccionado(null)}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left p-3 font-semibold text-slate-700">Modelo</th>
                        <th className="text-left p-3 font-semibold text-slate-700">Categoría</th>
                        <th className="text-left p-3 font-semibold text-slate-700">Tipo CB</th>
                        <th className="text-left p-3 font-semibold text-slate-700">Estado</th>
                        <th className="text-right p-3 font-semibold text-slate-700">FC</th>
                        <th className="text-right p-3 font-semibold text-slate-700">BO</th>
                        <th className="text-right p-3 font-semibold text-slate-700">Última act.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalleSKUs.map((item, i) => (
                        <tr key={`${item.sku}-${item.tipo}-${i}`} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3 font-mono text-slate-900">{item.sku}</td>
                          <td className="p-3 text-slate-600">{item.categoria}</td>
                          <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded font-medium ${item.tipo === "INFALTABLE" ? "bg-violet-50 text-violet-700" : "bg-pink-50 text-pink-700"}`}>{item.tipo}</span></td>
                          <td className="p-3"><EstadoBadge estado={item.estado} /></td>
                          <td className="p-3 text-right text-green-700 font-medium">{item.fcUnits > 0 ? `${item.fcUnits}u` : "—"}</td>
                          <td className="p-3 text-right text-amber-700 font-medium">{item.boUnits > 0 ? `${item.boUnits}u` : "—"}</td>
                          <td className="p-3 text-right text-slate-600 font-mono text-xs">{formatFecha(item.ultimaActualizacion)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            )}

            <Panel title="Detalle por SKU del Cuadro Básico" icon={<FileText className="w-4 h-4 text-slate-600" />}>
              <TablaSKUs rows={skusDetalle} mostrarClientes={filters.cliente === "TODOS"} />
            </Panel>
          </>
        )}

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Mockup con datos simulados.</strong> Hacé click en una fila de la tabla &ldquo;Cumplimiento por Cliente&rdquo; para ver el detalle de SKUs.
          </p>
        </div>
      </div>
    </div>
  );
}

type FilaCumpl = {
  nombre: string;
  pctCB: number;
  pctInf: number;
  pctEst: number;
};

function TablaCumplimiento({
  title, icon, columnHeader, rows, onRowClick,
}: {
  title: string;
  icon: React.ReactNode;
  columnHeader: string;
  rows: FilaCumpl[];
  onRowClick?: (nombre: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-slate-900">{title}</h3>
        </div>
        <span className="text-xs text-slate-500">Δ vs objetivo {OBJETIVO}%</span>
      </div>
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-[1]">
            <tr>
              <th style={{ backgroundColor: "#ffffff" }} className="text-center p-3 font-semibold text-slate-700 border-b-2 border-slate-200 whitespace-nowrap">{columnHeader}</th>
              <th style={{ backgroundColor: "#1e3a8a" }} className="text-center p-3 font-bold text-white border-l border-blue-900" colSpan={2}>% CB</th>
              <th style={{ backgroundColor: "#1e3a8a" }} className="text-center p-3 font-bold text-white border-l border-blue-900" colSpan={2}>% INFALTABLES</th>
              <th style={{ backgroundColor: "#1e3a8a" }} className="text-center p-3 font-bold text-white border-l border-blue-900" colSpan={2}>% ESTRATÉGICO</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.nombre} className={`border-b border-slate-100 ${onRowClick ? "cursor-pointer hover:bg-slate-50" : ""}`} onClick={() => onRowClick && onRowClick(r.nombre)}>
                <td className="p-2.5 text-slate-900 font-medium whitespace-nowrap max-w-[200px] truncate" title={r.nombre}>{r.nombre}</td>
                <CeldaPct pct={r.pctCB} />
                <CeldaDelta pct={r.pctCB} />
                <CeldaPct pct={r.pctInf} />
                <CeldaDelta pct={r.pctInf} />
                <CeldaPct pct={r.pctEst} />
                <CeldaDelta pct={r.pctEst} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CeldaPct({ pct }: { pct: number }) {
  const bg = pct >= 80 ? "bg-green-200 text-green-900" : pct >= 70 ? "bg-yellow-100 text-yellow-900" : "bg-red-200 text-red-900";
  return <td className={`text-center p-2.5 font-bold ${bg}`}>{pct}%</td>;
}

function CeldaDelta({ pct }: { pct: number }) {
  const delta = pct - OBJETIVO;
  const isPositive = delta > 0;
  const isZero = delta === 0;
  const color = isZero ? "text-slate-500" : isPositive ? "text-green-700" : "text-red-600";
  const Icon = isZero ? Minus : isPositive ? ChevronUp : ChevronDown;
  const sign = isPositive ? "+" : "";
  return (
    <td className={`text-center p-2.5 font-medium ${color} bg-slate-50`}>
      <span className="inline-flex items-center gap-0.5">
        {sign}{delta} pp <Icon className="w-3 h-3" />
      </span>
    </td>
  );
}

function Panel({
  title, icon, children, actionLabel, onAction,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200">
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-slate-900">{title}</h3>
        </div>
        {actionLabel && (
          <button onClick={onAction} className="text-xs text-slate-600 hover:text-slate-900 font-medium">{actionLabel}</button>
        )}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function FilterDropdown({
  label, value, onChange, options, wide,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
  wide?: boolean;
}) {
  return (
    <div className={`flex flex-col ${wide ? "min-w-[200px]" : "min-w-[140px]"}`}>
      <label className="text-[10px] font-bold text-slate-600 mb-1 tracking-wider">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-slate-300 rounded-md bg-white text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.l}</option>
        ))}
      </select>
    </div>
  );
}

function KpiCard({
  label, value, subtitle, icon, color, pct,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactElement;
  color: "blue" | "violet" | "pink" | "slate" | "red";
  pct?: number;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    pink: "bg-pink-50 text-pink-600",
    slate: "bg-slate-100 text-slate-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-slate-600">{label}</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
          {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
        </div>
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          {React.cloneElement(icon, { className: "w-5 h-5" } as React.HTMLAttributes<HTMLElement>)}
        </div>
      </div>
      {pct !== undefined && (
        <div className="mt-3 w-full h-1 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full ${pct >= 80 ? "bg-green-500" : pct >= 70 ? "bg-yellow-400" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const config: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
    FACTURADO: { color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="w-3 h-3" />, label: "Facturado" },
    BACKORDER: { color: "bg-amber-100 text-amber-700", icon: <Clock className="w-3 h-3" />, label: "Back Order" },
    PENDIENTE: { color: "bg-red-100 text-red-700", icon: <XCircle className="w-3 h-3" />, label: "Pendiente" },
  };
  const c = config[estado];
  return <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium ${c.color}`}>{c.icon} {c.label}</span>;
}

function MultiSelectDropdown({
  label, values, onChange, options, placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  options: { v: string; l: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const display =
    values.length === 0
      ? placeholder ?? "Todos"
      : values.length === 1
      ? options.find((o) => o.v === values[0])?.l ?? values[0]
      : `${values.length} seleccionados`;

  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);

  return (
    <div ref={ref} className="flex flex-col min-w-[140px] relative">
      <label className="text-[10px] font-bold text-slate-600 mb-1 tracking-wider">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-2 border border-slate-300 rounded-md bg-white text-sm text-left flex justify-between items-center gap-2 hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <span className="truncate">{display}</span>
        <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-full bg-white border border-slate-300 rounded-md shadow-lg z-20 max-h-72 overflow-y-auto">
          {values.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 border-b border-slate-200"
            >
              Limpiar selección
            </button>
          )}
          {options.map((o) => (
            <label key={o.v} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm whitespace-nowrap">
              <input
                type="checkbox"
                checked={values.includes(o.v)}
                onChange={() => toggle(o.v)}
                className="w-3.5 h-3.5"
              />
              <span>{o.l}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function TablaSKUs({ rows, mostrarClientes }: {
  rows: Array<{
    sku: string;
    categoria: string;
    tipo: "INFALTABLE" | "ESTRATEGICO";
    clientesEnCB: number;
    clientesCumplidos: number;
    fcUnits: number;
    boUnits: number;
    pct: number;
  }>;
  mostrarClientes: boolean;
}) {
  const totalPorTipo = (tipo: "INFALTABLE" | "ESTRATEGICO") => {
    const r = rows.filter((x) => x.tipo === tipo);
    const en = r.reduce((a, x) => a + x.clientesEnCB, 0);
    const cu = r.reduce((a, x) => a + x.clientesCumplidos, 0);
    const fc = r.reduce((a, x) => a + x.fcUnits, 0);
    const bo = r.reduce((a, x) => a + x.boUnits, 0);
    return {
      label: `TOTAL ${tipo === "INFALTABLE" ? "INFALTABLES" : "ESTRATÉGICO"}`,
      fcUnits: fc,
      boUnits: bo,
      total: fc + bo,
      clientesEnCB: en,
      clientesCumplidos: cu,
      pct: en > 0 ? Math.round((cu / en) * 100) : 0,
    };
  };
  const totInf = totalPorTipo("INFALTABLE");
  const totEst = totalPorTipo("ESTRATEGICO");
  const enTot = totInf.clientesEnCB + totEst.clientesEnCB;
  const cuTot = totInf.clientesCumplidos + totEst.clientesCumplidos;
  const totGen = {
    label: "TOTAL GENERAL",
    fcUnits: totInf.fcUnits + totEst.fcUnits,
    boUnits: totInf.boUnits + totEst.boUnits,
    total: totInf.fcUnits + totInf.boUnits + totEst.fcUnits + totEst.boUnits,
    clientesEnCB: enTot,
    clientesCumplidos: cuTot,
    pct: enTot > 0 ? Math.round((cuTot / enTot) * 100) : 0,
  };

  const infRows = rows.filter((r) => r.tipo === "INFALTABLE");
  const estRows = rows.filter((r) => r.tipo === "ESTRATEGICO");
  const totalCols = mostrarClientes ? 6 : 5;
  // Spans para la celda "TOTAL XXX" en filas resumen: cubre las cols de
  // texto antes de los números (Categoría + SKU + Clientes? = 3 o 2).
  const labelSpan = mostrarClientes ? 3 : 2;

  return (
    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-[1]">
          <tr>
            <th className="text-left p-3 font-semibold text-slate-700">Categoría</th>
            <th className="text-left p-3 font-semibold text-slate-700">SKU</th>
            {mostrarClientes && <th className="text-right p-3 font-semibold text-slate-700">Clientes</th>}
            <th className="text-right p-3 font-semibold text-slate-700">Facturado</th>
            <th className="text-right p-3 font-semibold text-slate-700">Back Order</th>
            <th className="text-right p-3 font-semibold text-slate-700">Total</th>
            <th className="text-right p-3 font-semibold text-slate-700">% Cumpl.</th>
          </tr>
        </thead>
        <tbody>
          {infRows.length > 0 && (
            <tr className="bg-violet-50">
              <td colSpan={totalCols} className="px-3 py-1.5 text-xs font-bold text-violet-800 uppercase tracking-wider">Infaltables</td>
            </tr>
          )}
          {infRows.map((r) => <FilaSKU key={`inf-${r.sku}`} r={r} mostrarClientes={mostrarClientes} />)}
          {infRows.length > 0 && <FilaTotal r={totInf} accent="violet" labelSpan={labelSpan} />}

          {estRows.length > 0 && (
            <tr className="bg-pink-50">
              <td colSpan={totalCols} className="px-3 py-1.5 text-xs font-bold text-pink-800 uppercase tracking-wider">Estratégico</td>
            </tr>
          )}
          {estRows.map((r) => <FilaSKU key={`est-${r.sku}`} r={r} mostrarClientes={mostrarClientes} />)}
          {estRows.length > 0 && <FilaTotal r={totEst} accent="pink" labelSpan={labelSpan} />}

          {(infRows.length > 0 || estRows.length > 0) && <FilaTotal r={totGen} accent="slate" labelSpan={labelSpan} grand />}
        </tbody>
      </table>
    </div>
  );
}

function FilaSKU({ r, mostrarClientes }: {
  r: {
    sku: string;
    categoria: string;
    tipo: "INFALTABLE" | "ESTRATEGICO";
    clientesEnCB: number;
    clientesCumplidos: number;
    fcUnits: number;
    boUnits: number;
    pct: number;
  };
  mostrarClientes: boolean;
}) {
  const pctBg = r.pct >= 80 ? "bg-green-100 text-green-800" : r.pct >= 70 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  const total = r.fcUnits + r.boUnits;
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="p-3 text-slate-600">{r.categoria}</td>
      <td className="p-3 font-mono text-slate-900">{r.sku}</td>
      {mostrarClientes && (
        <td className="p-3 text-right text-slate-600 font-mono text-xs">{r.clientesCumplidos}/{r.clientesEnCB}</td>
      )}
      <td className="p-3 text-right text-green-700 font-medium">{r.fcUnits > 0 ? `${r.fcUnits.toLocaleString("es-AR")}u` : "—"}</td>
      <td className="p-3 text-right text-amber-700 font-medium">{r.boUnits > 0 ? `${r.boUnits.toLocaleString("es-AR")}u` : "—"}</td>
      <td className="p-3 text-right text-slate-900 font-semibold">{total > 0 ? `${total.toLocaleString("es-AR")}u` : "—"}</td>
      <td className={`p-3 text-right font-bold ${pctBg}`}>{r.pct}%</td>
    </tr>
  );
}

function FilaTotal({ r, accent, labelSpan, grand }: {
  r: { label: string; fcUnits: number; boUnits: number; total: number; pct: number };
  accent: "violet" | "pink" | "slate";
  labelSpan: number;
  grand?: boolean;
}) {
  const bg = accent === "violet" ? "bg-violet-100" : accent === "pink" ? "bg-pink-100" : "bg-slate-200";
  const txt = accent === "violet" ? "text-violet-900" : accent === "pink" ? "text-pink-900" : "text-slate-900";
  const pctBg = r.pct >= 80 ? "bg-green-200 text-green-900" : r.pct >= 70 ? "bg-yellow-200 text-yellow-900" : "bg-red-200 text-red-900";
  return (
    <tr className={`${bg} ${grand ? "border-t-2 border-slate-400" : "border-b border-slate-200"}`}>
      <td className={`p-3 font-bold text-xs uppercase tracking-wider ${txt}`} colSpan={labelSpan}>{r.label}</td>
      <td className={`p-3 text-right font-bold ${txt}`}>{r.fcUnits > 0 ? `${r.fcUnits.toLocaleString("es-AR")}u` : "—"}</td>
      <td className={`p-3 text-right font-bold ${txt}`}>{r.boUnits > 0 ? `${r.boUnits.toLocaleString("es-AR")}u` : "—"}</td>
      <td className={`p-3 text-right font-bold ${txt}`}>{r.total > 0 ? `${r.total.toLocaleString("es-AR")}u` : "—"}</td>
      <td className={`p-3 text-right font-bold ${pctBg}`}>{r.pct}%</td>
    </tr>
  );
}
