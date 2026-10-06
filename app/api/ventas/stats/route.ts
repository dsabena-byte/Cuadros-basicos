import { NextResponse } from "next/server";
import { readVentas } from "@/lib/storage";
import { loadCuadroBasico, loadClasificacion } from "@/lib/data";
import { calcularPorcentajes, mesEnCursoDe } from "@/lib/sellin-metrics";
import { withCors, corsPreflight } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const OPTIONS = () => corsPreflight();

// GET /api/ventas/stats?secret=XXX
// Endpoint de diagnóstico — devuelve un resumen del blob de ventas y
// comparaciones con el CB. Usa el mismo REFRESH_SECRET1 que /api/ventas y
// /api/cb-pairs. No es público: solo para debug desde scripts/CLI.
function checkSecret(request: Request): boolean {
  const expected = process.env.REFRESH_SECRET1;
  if (!expected) return false;
  const url = new URL(request.url);
  const provided =
    request.headers.get("x-refresh-secret") ?? url.searchParams.get("secret") ?? "";
  return provided === expected;
}

function unauthorized() {
  return withCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
}

export async function GET(request: Request) {
  if (!checkSecret(request)) return unauthorized();
  try {
    const [ventas, cb, clasif] = await Promise.all([
      readVentas(),
      loadCuadroBasico(),
      loadClasificacion(),
    ]);

    const byMesTipo: Record<string, { fc: number; bo: number; fcUnits: number; boUnits: number }> = {};
    const vendedoresEnVentas = new Set<string>();
    const clientesEnVentas = new Set<string>();
    for (const r of ventas.rows) {
      const key = String(r.mes).padStart(2, "0");
      if (!byMesTipo[key]) byMesTipo[key] = { fc: 0, bo: 0, fcUnits: 0, boUnits: 0 };
      if (r.tipo === "FC") {
        byMesTipo[key].fc += 1;
        byMesTipo[key].fcUnits += r.unidades;
      } else {
        byMesTipo[key].bo += 1;
        byMesTipo[key].boUnits += r.unidades;
      }
      if (r.vendedor) vendedoresEnVentas.add(r.vendedor);
      if (r.cliente) clientesEnVentas.add(r.cliente);
    }

    const porMes = Object.entries(byMesTipo)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, v]) => ({ mes: Number(mes), ...v }));

    // Calcular KPIs usando la misma lógica que el dashboard
    const mesEnCurso = mesEnCursoDe(ventas.generatedAt);
    const kpisGlobales = calcularPorcentajes(cb, ventas.rows, {
      hayFiltroMes: false,
      mesEnCurso,
    });

    const vendedoresEnClasif = new Set(clasif.map((c) => c.vendedor));
    const clientesEnClasif = new Set(clasif.map((c) => c.cliente));

    return withCors(NextResponse.json({
      ok: true,
      generatedAt: ventas.generatedAt,
      mesEnCurso,
      totales: {
        rows: ventas.rows.length,
        fc: ventas.rows.filter((r) => r.tipo === "FC").length,
        bo: ventas.rows.filter((r) => r.tipo === "BO").length,
        clientesUnicos: clientesEnVentas.size,
        vendedoresUnicos: vendedoresEnVentas.size,
      },
      cb: {
        items: cb.length,
        clientesEnCB: new Set(cb.map((c) => c.cliente)).size,
        skusEnCB: new Set(cb.map((c) => c.sku)).size,
      },
      clasificacion: {
        clientes: clientesEnClasif.size,
        vendedores: vendedoresEnClasif.size,
      },
      kpisGlobales,
      porMes,
      vendedoresEnVentasNoEnClasif: [...vendedoresEnVentas]
        .filter((v) => !vendedoresEnClasif.has(v))
        .sort(),
      clientesEnVentasNoEnCB: [...clientesEnVentas]
        .filter((c) => !new Set(cb.map((x) => x.cliente)).has(c))
        .sort()
        .slice(0, 20),
    }));
  } catch (err) {
    return withCors(NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "read failed" },
      { status: 500 },
    ));
  }
}
