import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  authenticate,
  setPassword,
  verifySessionToken,
  SESSION_COOKIE,
} from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = cookies().get(SESSION_COOKIE.name)?.value;
  if (!token) return NextResponse.json({ error: "No hay sesión" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = (await request.json()) as { currentPassword?: string; newPassword?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const currentPassword = body.currentPassword ?? "";
  const newPassword = body.newPassword ?? "";
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "La clave nueva debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const check = await authenticate(session.email, currentPassword);
  if (!check.ok) {
    return NextResponse.json({ error: "La clave actual no es correcta" }, { status: 401 });
  }
  try {
    await setPassword(session.email, newPassword);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error guardando la clave";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
