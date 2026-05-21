import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Protege /ventas/* (excepto /ventas/login). Redirige a /ventas/login si
// no hay sesión válida.
//
// Edge runtime: usamos jose para verificar el JWT directamente (no
// podemos importar lib/users acá porque arrastra googleapis y Node APIs).

const SESSION_COOKIE_NAME = "ventas_session";

function getJwtSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET no está configurado");
  return new TextEncoder().encode(s);
}

async function isAuthed(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getJwtSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === "/ventas/login" || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (await isAuthed(token)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/ventas/login";
  url.search = `?from=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/ventas/:path*"],
};
