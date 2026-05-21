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
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!apiKey || !from || !adminEmail) {
    console.error("[auth/forgot] RESEND_API_KEY / MAIL_FROM / ADMIN_EMAIL no configurados");
    return okResponse;
  }

  const hash = await currentPasswordHash(email);
  const token = await signResetToken(email, hash);
  const link = `${getAppUrl(request)}/ventas/login?token=${encodeURIComponent(token)}`;

  // El reset es admin-gated: el mail va al admin con el link para elegirle
  // la clave a esta persona. El admin después se la pasa por WhatsApp.
  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: adminEmail,
      subject: `Reset de clave — ${user.nombre || email}`,
      html: `
        <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; color: #0f172a;">
          <h2 style="font-size: 18px;">${user.nombre || email} pidió resetear la clave</h2>
          <p>
            <strong>Email:</strong> ${email}<br/>
            <strong>Rol:</strong> ${user.rol}${user.vendedor ? ` — ${user.vendedor}` : ""}
          </p>
          <p>Apretá el botón para elegirle una clave nueva. Después se la pasás por WhatsApp/mail.</p>
          <p>
            <a href="${link}" style="display: inline-block; padding: 10px 18px; background: #2563eb; color: white; border-radius: 6px; text-decoration: none; font-weight: 600;">
              Elegir clave para ${user.nombre || email}
            </a>
          </p>
          <p style="font-size: 12px; color: #64748b;">El link sirve por 30 minutos.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[auth/forgot] Resend falló:", err);
  }
  return okResponse;
}
