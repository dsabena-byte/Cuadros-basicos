import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminResetPassword, verifySessionToken, SESSION_COOKIE } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = cookies().get(SESSION_COOKIE.name)?.value;
  if (!token) return NextResponse.json({ error: "No hay sesión" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  if (session.rol !== "all") {
    return NextResponse.json({ error: "Sólo admin" }, { status: 403 });
  }

  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

  try {
    await adminResetPassword(email);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
