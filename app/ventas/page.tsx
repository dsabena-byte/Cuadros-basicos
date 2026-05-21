import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import { loadCuadroBasico, loadClasificacion, loadVentas } from "@/lib/data";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/users";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  // El middleware ya redirige a /ventas/login si no hay cookie; este check
  // es belt-and-suspenders por si el middleware no corre (ej. dev local sin
  // JWT_SECRET seteado, o un cambio de config).
  const token = cookies().get(SESSION_COOKIE.name)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) redirect("/ventas/login");

  const [cuadroBasico, clasificacion, ventas] = await Promise.all([
    loadCuadroBasico(),
    loadClasificacion(),
    loadVentas(),
  ]);

  // Si el usuario es vendedor, filtramos server-side para no mandar al
  // cliente datos de otros vendedores. El nombre del vendedor en el sheet
  // de usuarios tiene que matchear EXACTO el de la columna VENDEDOR del
  // CSV de clasificación.
  let filteredClasificacion = clasificacion;
  let filteredCuadroBasico = cuadroBasico;
  let filteredVentas = ventas;

  if (session.rol === "vendedor") {
    const allowedClientes = new Set(
      clasificacion.filter((c) => c.vendedor === session.vendedor).map((c) => c.cliente),
    );
    filteredClasificacion = clasificacion.filter((c) => allowedClientes.has(c.cliente));
    filteredCuadroBasico = cuadroBasico.filter((c) => allowedClientes.has(c.cliente));
    filteredVentas = {
      ...ventas,
      rows: ventas.rows.filter((r) => allowedClientes.has(r.cliente)),
    };
  }

  return (
    <Dashboard
      cuadroBasico={filteredCuadroBasico}
      clasificacion={filteredClasificacion}
      ventas={filteredVentas}
      user={session}
    />
  );
}
