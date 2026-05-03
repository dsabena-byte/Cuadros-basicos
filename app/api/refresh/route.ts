import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const expected = process.env.REFRESH_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "REFRESH_SECRET no está configurado en el server" },
      { status: 500 },
    );
  }
  const url = new URL(request.url);
  const provided =
    request.headers.get("x-refresh-secret") ?? url.searchParams.get("secret") ?? "";
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // La home es dinámica y consume /api/data desde el cliente,
  // así que sólo revalidamos el endpoint de datos.
  revalidatePath("/api/data");

  return NextResponse.json({ ok: true, refreshedAt: new Date().toISOString() });
}

export async function GET(request: Request) {
  return POST(request);
}
