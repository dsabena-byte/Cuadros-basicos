import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { listUsersPublic, verifySessionToken, SESSION_COOKIE } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = cookies().get(SESSION_COOKIE.name)?.value;
  if (!token) return NextResponse.json({ error: "No hay sesión" }, { status: 401 });
  const session = await verifySessionToken(token);
  if (!session) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  if (session.rol !== "all") {
    return NextResponse.json({ error: "Sólo admin" }, { status: 403 });
  }
  const users = await listUsersPublic();
  return NextResponse.json({ users });
}
