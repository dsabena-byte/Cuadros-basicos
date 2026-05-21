import { NextResponse } from "next/server";
import { authenticate, signSessionToken, SESSION_COOKIE } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const email = (body.email ?? "").trim();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email y clave son requeridos" }, { status: 400 });
  }

  const result = await authenticate(email, password);
  if (!result.ok) {
    // Misma respuesta para user_not_found y wrong_password — no doy pistas
    // a quien intente enumerar usuarios.
    if (result.error === "no_password_set") {
      return NextResponse.json(
        { error: "Este usuario no tiene clave configurada. Contactá al admin." },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const token = await signSessionToken(result.session);
  const res = NextResponse.json({ ok: true, user: result.session });
  res.cookies.set(SESSION_COOKIE.name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE.maxAge,
  });
  return res;
}
