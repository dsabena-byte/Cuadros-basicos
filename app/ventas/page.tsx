import Dashboard from "@/components/Dashboard";
import { loadCuadroBasico, loadClasificacion, loadVentas } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const [cuadroBasico, clasificacion, ventas] = await Promise.all([
    loadCuadroBasico(),
    loadClasificacion(),
    loadVentas(),
  ]);
  return (
    <Dashboard
      cuadroBasico={cuadroBasico}
      clasificacion={clasificacion}
      ventas={ventas}
    />
  );
}
