// Normalización de nombres de cliente para matcheo cliente+sku entre
// ventas (Office Script del Excel) y CB (CSV en Drive).
//
// Variaciones comunes de puntuación que todas tienen que colapsar al mismo
// string canónico:
//   "FRAVEGA S A C I E I"          (CSV clasificación)
//   "FRAVEGA S.A.C.I.E.I"           (Excel ventas)
//   "ELECTRONICA MEGATONE SRL"
//   "ELECTRONICA MEGATONE S.R.L."
//   "MARANSI S A", "MARANSI S.A.", "MARANSI SA"
//
// Estrategia: uppercase, trim, quitar puntos y colapsar TODOS los espacios.
// Esto convierte "S A", "S.A.", "SA" en el mismo "SA".
//
// Riesgo: colisiones accidentales (ej. "CASA SA" vs "CASAS A"). En la
// práctica es raro y el join también usa SKU que casi siempre los
// distingue; aceptamos el trade-off a favor de recuperar las ventas que
// hoy se descartan silenciosamente.
//
// Importante: la MISMA función tiene que correr en el Office Script del
// Excel para que el GET a /api/cb-pairs y el matching local usen el mismo
// string normalizado. Ver docs/office-scripts.md si existe.
export function normalizeCliente(s: string): string {
  return String(s ?? "")
    .trim()
    .toUpperCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "");
}
