import { getDataset } from "@/lib/data-source";
import { construirAnalisisTrade } from "@/lib/analisis-trade";
import { AnalisisTradeView } from "@/components/AnalisisTrade";
import { DataChat } from "@/components/DataChat";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const dataset = await getDataset();
  const analisis = construirAnalisisTrade(dataset.rows, dataset.floorShare);

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-4">
          <h1 className="text-xl font-bold text-slate-900">Cuadro Básico Trade × Floor Share</h1>
          <p className="text-sm text-slate-500">Cómo cerrar el Cuadro Básico en cada tienda impacta el share de góndola de Drean.</p>
        </header>
        <AnalisisTradeView analisis={analisis} />
      </div>
      <DataChat dashboard="trade-cruce" />
    </main>
  );
}
