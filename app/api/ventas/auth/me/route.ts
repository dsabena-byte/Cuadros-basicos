import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = cookies().get(SESSION_COOKIE.name)?.value;
  if (!token) return NextResponse.json({ user: null });
  const session = await verifySessionToken(token);
  return NextResponse.json({ user: session });
}
