import { NextResponse } from "next/server";
import { Resend } from "resend";
import { currentPasswordHash, findUser, signResetToken } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAppUrl(request: Request): string {
  const fromEnv = process.env.APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

  // Respondemos siempre 200 para no permitir enumeración de usuarios.
  const okResponse = NextResponse.json({ ok: true });

  const user = await findUser(email).catch(() => null);
  if (!user) return okResponse;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) {
    console.error("[auth/forgot] RESEND_API_KEY o MAIL_FROM no configurados — no mando el email");
    return okResponse;
  }

  const hash = await currentPasswordHash(email);
  const token = await signResetToken(email, hash);
  const link = `${getAppUrl(request)}/ventas/login?token=${encodeURIComponent(token)}`;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: email,
      subject: "Reseteo de clave — Cuadro Básico Drean",
      html: `
        <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
          <h2 style="font-size: 18px;">Hola ${user.nombre || email},</h2>
          <p>Te llegó este mail porque pediste resetear la clave del dashboard de Ventas.</p>
          <p>
            <a href="${link}" style="display: inline-block; padding: 10px 18px; background: #2563eb; color: white; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Elegir clave nueva
            </a>
          </p>
          <p style="font-size: 12px; color: #64748b;">El link sirve por 30 minutos. Si no fuiste vos, ignorá este mail.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[auth/forgot] Resend falló:", err);
  }
  return okResponse;
}
