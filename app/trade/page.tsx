import { getDataset } from "@/lib/data-source";
import { construirAnalisisTrade, periodosDisponibles } from "@/lib/analisis-trade";
import { AnalisisTradeView } from "@/components/AnalisisTrade";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({ searchParams }: { searchParams?: { embed?: string } }) {
  const dataset = await getDataset();
  // Un análisis por mes fiscal (el último es el default en la vista).
  const periodos = periodosDisponibles(dataset.rows, dataset.floorShare).map((p) => ({
    mes: p.mes,
    semanas: p.semanas,
    analisis: construirAnalisisTrade(dataset.rows, dataset.floorShare, new Set(p.semanas)),
  }));
  const embed = searchParams?.embed === "1";

  return (
    <main className={`bg-slate-50 ${embed ? "p-3 sm:p-4" : "min-h-screen p-4 sm:p-6"}`}>
      <div className="max-w-6xl mx-auto">
        {!embed && (
          <header className="mb-4">
            <a href="/" className="text-xs text-blue-600 hover:underline">← Volver al dashboard</a>
            <h1 className="text-xl font-bold text-slate-900 mt-1">Cuadro Básico Trade × Floor Share</h1>
            <p className="text-sm text-slate-500">Cómo cerrar el Cuadro Básico en cada tienda impacta el share de góndola de Drean.</p>
          </header>
        )}
        <AnalisisTradeView periodos={periodos} />
      </div>
    </main>
  );
}
