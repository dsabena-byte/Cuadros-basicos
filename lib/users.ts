import { listFolderFiles, downloadFile, findSubfolderId } from "./drive";
import { put, get } from "@vercel/blob";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

// Sistema de usuarios para el dashboard de Ventas.
//
// Fuente de verdad: usuarios.csv en Drive (mismo folder padre que el resto
// de los CSVs de CB). Columnas:
//   email;nombre;rol;vendedor;password_hash
// - rol: "all" o "vendedor"
// - vendedor: vacío si rol=all; si rol=vendedor, debe matchear EXACTO la
//   columna VENDEDOR de Clasificacion-clientes-*.csv
// - password_hash: bcrypt (puede dejarse vacío y usar INITIAL_PASSWORD)
//
// Overrides de password: cuando un usuario cambia su clave (vía cambio
// voluntario o magic link de reset) guardamos el hash nuevo en un blob,
// porque la Drive API que usamos es read-only.

const USERS_FILENAME_PATTERN = /^usuarios?[\s\-_]*/i;
const CB_SUBFOLDER_NAME = "cuadro-basico-ventas";
const CACHE_TTL_MS = 5 * 60 * 1000;
const OVERRIDES_BLOB_PATH = "users-password-overrides.json";

export type UserRol = "all" | "vendedor";

export type UserRecord = {
  email: string;
  nombre: string;
  rol: UserRol;
  vendedor: string;
  passwordHash: string;
};

export type SessionPayload = {
  email: string;
  nombre: string;
  rol: UserRol;
  vendedor: string;
};

// ----- CSV parser (idéntico al de cb-drive.ts; lo duplico acá para no
// crear una dep circular y mantener este módulo autocontenido) ------------

function parseCsv(buf: Buffer): Array<Record<string, string>> {
  let text = new TextDecoder("utf-8").decode(buf).replace(/^﻿/, "").replace(/\r\n/g, "\n").trim();
  if (text.includes("�")) {
    text = new TextDecoder("latin1").decode(buf).replace(/\r\n/g, "\n").trim();
  }
  const firstLine = text.split("\n")[0] ?? "";
  const delim = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";
  const [header, ...lines] = text.split("\n");
  const cols = header.split(delim).map((c) => c.trim());
  return lines.filter((l) => l.length > 0).map((line) => {
    const cells = line.split(delim);
    const row: Record<string, string> = {};
    for (let i = 0; i < cols.length; i++) row[cols[i]] = (cells[i] ?? "").trim();
    return row;
  });
}

function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[\s_\-]+/g, " ")
    .trim();
}

function pick(row: Record<string, string>, ...candidates: string[]): string {
  const idx: Record<string, string> = {};
  for (const k of Object.keys(row)) idx[normalizeHeader(k)] = k;
  for (const c of candidates) {
    const realKey = idx[normalizeHeader(c)];
    if (realKey != null) return row[realKey] ?? "";
  }
  return "";
}

// ----- Drive lookup --------------------------------------------------------

async function resolveUsersFolderId(): Promise<string> {
  const override = process.env.DRIVE_CB_FOLDER_ID;
  if (override) return override;
  const parent = process.env.DRIVE_FOLDER_ID;
  if (!parent) throw new Error("Falta DRIVE_FOLDER_ID");
  const sub = await findSubfolderId(parent, CB_SUBFOLDER_NAME).catch(() => null);
  return sub ?? parent;
}

async function downloadUsersCsv(): Promise<UserRecord[]> {
  const folderId = await resolveUsersFolderId();
  const files = await listFolderFiles(folderId);
  const usersFile = files.find(
    (f) => USERS_FILENAME_PATTERN.test(f.name) && /\.csv$/i.test(f.name),
  );
  if (!usersFile) {
    throw new Error(
      "No encontré usuarios.csv en Drive (esperaba un archivo cuyo nombre empiece con 'usuarios')",
    );
  }
  const buf = await downloadFile(usersFile.id);
  const rows = parseCsv(buf);
  const users: UserRecord[] = [];
  for (const r of rows) {
    const email = pick(r, "email", "mail").trim().toLowerCase();
    if (!email) continue;
    const rolRaw = pick(r, "rol", "role").trim().toLowerCase();
    const rol: UserRol = rolRaw === "vendedor" ? "vendedor" : "all";
    users.push({
      email,
      nombre: pick(r, "nombre", "nombre y apellido", "name").trim(),
      rol,
      vendedor: pick(r, "vendedor").trim(),
      passwordHash: pick(r, "password_hash", "password hash", "hash").trim(),
    });
  }
  return users;
}

// ----- Blob overrides ------------------------------------------------------

type OverridesMap = Record<string, { hash: string; updatedAt: string }>;

async function readOverrides(): Promise<OverridesMap> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return {};
  try {
    const result = await get(OVERRIDES_BLOB_PATH, { access: "private", useCache: false });
    if (result && result.statusCode === 200 && result.stream) {
      const text = await new Response(result.stream).text();
      return JSON.parse(text) as OverridesMap;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/not.*found|404/i.test(message)) throw err;
  }
  return {};
}

async function writeOverrides(map: OverridesMap): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN no está configurado (no puedo guardar cambios de password)");
  }
  await put(OVERRIDES_BLOB_PATH, JSON.stringify(map), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}

// ----- Caché (TTL) ---------------------------------------------------------

type Snapshot = {
  users: UserRecord[];
  overrides: OverridesMap;
  builtAt: number;
};

let cache: Snapshot | null = null;
let inflight: Promise<Snapshot> | null = null;

export function invalidateUsersCache(): void {
  cache = null;
  inflight = null;
}

async function buildSnapshot(): Promise<Snapshot> {
  const [users, overrides] = await Promise.all([downloadUsersCsv(), readOverrides()]);
  return { users, overrides, builtAt: Date.now() };
}

async function getSnapshot(): Promise<Snapshot> {
  if (cache && Date.now() - cache.builtAt < CACHE_TTL_MS) return cache;
  if (inflight) return inflight;
  inflight = buildSnapshot().then((s) => {
    cache = s;
    return s;
  });
  inflight.finally(() => {
    inflight = null;
  });
  return inflight;
}

// ----- API pública ---------------------------------------------------------

export type LoginResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; error: "user_not_found" | "wrong_password" | "no_password_set" };

export async function authenticate(emailRaw: string, password: string): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !password) return { ok: false, error: "user_not_found" };
  const { users, overrides } = await getSnapshot();
  const user = users.find((u) => u.email === email);
  if (!user) return { ok: false, error: "user_not_found" };

  const override = overrides[email];
  // Prioridad: override (blob) > hash en sheet > INITIAL_PASSWORD env var.
  if (override?.hash) {
    const ok = await bcrypt.compare(password, override.hash);
    return ok
      ? { ok: true, session: toSession(user) }
      : { ok: false, error: "wrong_password" };
  }
  if (user.passwordHash) {
    const ok = await bcrypt.compare(password, user.passwordHash);
    return ok
      ? { ok: true, session: toSession(user) }
      : { ok: false, error: "wrong_password" };
  }
  const initial = process.env.INITIAL_PASSWORD;
  if (!initial) return { ok: false, error: "no_password_set" };
  return password === initial
    ? { ok: true, session: toSession(user) }
    : { ok: false, error: "wrong_password" };
}

function toSession(u: UserRecord): SessionPayload {
  return { email: u.email, nombre: u.nombre, rol: u.rol, vendedor: u.vendedor };
}

export async function setPassword(emailRaw: string, newPassword: string): Promise<void> {
  const email = emailRaw.trim().toLowerCase();
  if (!email) throw new Error("email requerido");
  if (newPassword.length < 8) throw new Error("La clave nueva tiene que tener al menos 8 caracteres");
  const { users } = await getSnapshot();
  if (!users.find((u) => u.email === email)) {
    throw new Error("Usuario no existe");
  }
  const overrides = await readOverrides();
  const hash = await bcrypt.hash(newPassword, 10);
  overrides[email] = { hash, updatedAt: new Date().toISOString() };
  await writeOverrides(overrides);
  invalidateUsersCache();
}

export async function findUser(emailRaw: string): Promise<UserRecord | null> {
  const email = emailRaw.trim().toLowerCase();
  const { users } = await getSnapshot();
  return users.find((u) => u.email === email) ?? null;
}

// Hash actual (override o sheet) — sirve para incluirlo en el JWT del
// magic link y hacerlo single-use: si el hash cambió, el token cae.
export async function currentPasswordHash(emailRaw: string): Promise<string> {
  const email = emailRaw.trim().toLowerCase();
  const { users, overrides } = await getSnapshot();
  const override = overrides[email];
  if (override?.hash) return override.hash;
  const user = users.find((u) => u.email === email);
  return user?.passwordHash ?? "";
}

// ----- JWT session ---------------------------------------------------------

const SESSION_COOKIE_NAME = "ventas_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 días

function getJwtSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET no está configurado");
  return new TextEncoder().encode(s);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (
      typeof payload.email !== "string" ||
      typeof payload.nombre !== "string" ||
      typeof payload.vendedor !== "string"
    ) {
      return null;
    }
    const rol: UserRol = payload.rol === "vendedor" ? "vendedor" : "all";
    return {
      email: payload.email,
      nombre: payload.nombre,
      rol,
      vendedor: payload.vendedor,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = {
  name: SESSION_COOKIE_NAME,
  maxAge: SESSION_TTL_SECONDS,
};

// ----- Magic link de reset (single-use vía hash actual) --------------------

const RESET_TTL_SECONDS = 30 * 60; // 30 min

export async function signResetToken(email: string, currentHash: string): Promise<string> {
  // El payload incluye un fingerprint del hash actual. Cuando el usuario
  // setea una clave nueva, el hash cambia y todos los tokens viejos quedan
  // inválidos. Eso nos da single-use sin tener que persistir tokens.
  const fp = currentHash ? currentHash.slice(-12) : "empty";
  return new SignJWT({ email, fp, scope: "reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${RESET_TTL_SECONDS}s`)
    .sign(getJwtSecret());
}

export async function verifyResetToken(
  token: string,
): Promise<{ email: string; fp: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (
      payload.scope !== "reset" ||
      typeof payload.email !== "string" ||
      typeof payload.fp !== "string"
    ) {
      return null;
    }
    return { email: payload.email, fp: payload.fp };
  } catch {
    return null;
  }
}
