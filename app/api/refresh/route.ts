import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint para forzar revalidación del dashboard sin reescribir ventas.json
// (útil para debug o si Power Automate sólo quiere disparar el refresh
// porque ya escribió el blob por otra vía).

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkSecret(request: Request): boolean {
  const expected = process.env.REFRESH_SECRET;
  if (!expected) return false;
  const url = new URL(request.url);
  const provided =
    request.headers.get("x-refresh-secret") ??
    url.searchParams.get("secret") ??
    "";
  return provided === expected;
}

export async function POST(request: Request) {
  if (!checkSecret(request)) return unauthorized();
  revalidatePath("/");
  return NextResponse.json({ ok: true, refreshedAt: new Date().toISOString() });
}

export async function GET(request: Request) {
  return POST(request);
}
