import { NextResponse } from "next/server";
import {
  currentPasswordHash,
  setPassword,
  verifyResetToken,
  findUser,
} from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { token?: string; newPassword?: string };
  try {
    body = (await request.json()) as { token?: string; newPassword?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const token = body.token ?? "";
  const newPassword = body.newPassword ?? "";
  if (!token || !newPassword) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "La clave nueva debe tener al menos 8 caracteres" }, { status: 400 });
  }

  const decoded = await verifyResetToken(token);
  if (!decoded) {
    return NextResponse.json({ error: "Link inválido o expirado" }, { status: 401 });
  }

  // Single-use: el fp del token tiene que coincidir con el hash actual. Si
  // el usuario ya usó este token (o pidió otro), no se acepta.
  const currentHash = await currentPasswordHash(decoded.email);
  const currentFp = currentHash ? currentHash.slice(-12) : "empty";
  if (currentFp !== decoded.fp) {
    return NextResponse.json({ error: "Link ya usado" }, { status: 401 });
  }

  const user = await findUser(decoded.email);
  if (!user) {
    return NextResponse.json({ error: "Usuario no existe" }, { status: 404 });
  }

  try {
    await setPassword(decoded.email, newPassword);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error guardando";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // No auto-logueamos: el reset lo dispara el admin para otro usuario.
  // Le devolvemos el email para que la UI pueda mostrar "Compartilo con X".
  return NextResponse.json({ ok: true, email: user.email, nombre: user.nombre });
}
