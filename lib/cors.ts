import { NextResponse } from "next/server";

// CORS headers para que el Office Script (corre en sandbox de Excel Online,
// origen distinto) pueda fetchear los endpoints internos. Sin esto la
// respuesta llega pero el runtime de Office Scripts la rechaza con
// "Failed to fetch" porque falta Access-Control-Allow-Origin.
//
// Como los endpoints están gateados por REFRESH_SECRET1 (header
// x-refresh-secret o query string ?secret=...), abrir CORS con "*" no
// expone nada: sin el secret cualquier request — venga de donde venga —
// devuelve 401.

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-refresh-secret",
  "Access-Control-Max-Age": "86400",
};

export function withCors<T extends Response | NextResponse>(res: T): T {
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

export function corsPreflight(): NextResponse {
  return withCors(new NextResponse(null, { status: 204 }));
}
