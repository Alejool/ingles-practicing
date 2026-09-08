/**
 * Cliente de la API propia.
 *
 * Aquí no hay ninguna clave: la de DeepSeek vive en el servidor. Lo único que
 * guarda el navegador es un identificador de dispositivo (para la cuota de
 * prueba) y, si has entrado, el token de sesión.
 */

const BASE = (import.meta.env.PUBLIC_API_BASE || "").replace(/\/+$/, "");
const DEVICE_KEY = "ruta-b1b2-device";
const TOKEN_KEY = "ruta-b1b2-session";

export interface Quota {
  authenticated: boolean;
  used: number;
  limit: number;
  remaining: number;
  window: "total" | "día";
  resetsAt: string | null;
  monthlyUsed?: number;
  monthlyLimit?: number;
  globalRemaining: number;
}

export interface SessionInfo {
  user: { email: string } | null;
  quota: Quota | null;
}

export class ApiError extends Error {
  code: string;
  status: number;
  data: any;
  constructor(code: string, message: string, status = 0, data: any = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

function store(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

/** Identificador estable del navegador. No identifica a la persona, solo al aparato. */
export function deviceId(): string {
  const s = store();
  let id = s?.getItem(DEVICE_KEY) || "";
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    id = (crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2)).replace(/-/g, "");
    try { s?.setItem(DEVICE_KEY, id); } catch { /* modo privado */ }
  }
  return id;
}

export function sessionToken(): string {
  return store()?.getItem(TOKEN_KEY) || "";
}

export function setSessionToken(token: string | null): void {
  const s = store();
  try {
    if (token) s?.setItem(TOKEN_KEY, token);
    else s?.removeItem(TOKEN_KEY);
  } catch { /* modo privado */ }
}

export function isSignedIn(): boolean {
  return !!sessionToken();
}

export function headers(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { "X-Device-Id": deviceId(), ...extra };
  const t = sessionToken();
  if (t) h.Authorization = "Bearer " + t;
  return h;
}

export function apiUrl(path: string): string {
  return BASE + path;
}

async function parse(res: Response): Promise<any> {
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* respuesta no JSON */ }

  // Sin API detrás (típico en `astro dev` sin proxy) la respuesta es HTML, no JSON.
  if (!data && (res.status === 404 || res.status === 405)) {
    throw new ApiError(
      "api_unreachable",
      "No encuentro la API en " + (BASE || "este mismo origen") +
      ". Si estás en `npm run dev`, levanta el backend (bash start.sh) o define DEV_API_TARGET.",
      res.status
    );
  }
  if (!res.ok) {
    const err = data?.error || {};
    throw new ApiError(err.code || String(res.status), err.message || "Error " + res.status, res.status, err);
  }
  return data;
}

export async function get(path: string): Promise<any> {
  try {
    return await parse(await fetch(apiUrl(path), { headers: headers(), cache: "no-store" }));
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("network", "No se pudo conectar con el servidor.");
  }
}

export async function send(path: string, method: "POST" | "PUT", body: unknown): Promise<any> {
  try {
    return await parse(await fetch(apiUrl(path), {
      method,
      headers: headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(body ?? {}),
    }));
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("network", "No se pudo conectar con el servidor.");
  }
}

/* ---------- sesión y cuota ---------- */

let cached: SessionInfo = { user: null, quota: null };
const listeners: Array<(s: SessionInfo) => void> = [];

export function onSession(fn: (s: SessionInfo) => void): void {
  listeners.push(fn);
  fn(cached);
}

export function session(): SessionInfo {
  return cached;
}

function emit(next: SessionInfo): void {
  cached = next;
  listeners.forEach(fn => { try { fn(cached); } catch { /* un listener roto no tumba el resto */ } });
}

/** Refresca sesión y cuota. Nunca lanza: si el servidor no está, la app sigue. */
/**
 * ¿Hay servidor detrás?
 *
 * La app se puede publicar como archivos sueltos, sin API ni base de datos: así
 * funciona todo el estudio y solo faltan las correcciones. Saberlo permite
 * decirlo con claridad en vez de soltar «algo falló».
 */
let hayApi: boolean | null = null;
export function apiDisponible(): boolean | null { return hayApi; }

export async function refreshSession(): Promise<SessionInfo> {
  try {
    const data = await get("/api/auth/session");
    hayApi = true;
    emit({ user: data.user ?? null, quota: data.quota ?? null });
  } catch (e) {
    // 404/405 con cuerpo que no es de la API: no hay backend, no es un fallo.
    if (e instanceof ApiError && (e.status === 404 || e.status === 405)) hayApi = false;
    if (e instanceof ApiError && e.status === 401) {
      setSessionToken(null);
      emit({ user: null, quota: null });
    } else {
      emit({ user: cached.user, quota: null });
    }
  }
  return cached;
}

/** Actualiza el contador con lo que vino en las cabeceras de la respuesta del stream. */
export function noteQuotaHeaders(res: Response): void {
  const remaining = res.headers.get("X-Quota-Remaining");
  if (remaining === null || !cached.quota) return;
  emit({
    user: cached.user,
    quota: { ...cached.quota, remaining: Math.max(0, parseInt(remaining, 10) || 0), used: cached.quota.used + 1 },
  });
}

export interface LoginLinkResult {
  minutes: number;
  /** "mailbox" = buzón de desarrollo (Mailpit); "email" = correo real. */
  delivery?: "mailbox" | "email";
  mailboxUrl?: string | null;
}

export async function requestLoginLink(email: string): Promise<LoginLinkResult> {
  return await send("/api/auth/request", "POST", { email });
}

export async function logout(): Promise<void> {
  try { await send("/api/auth/session", "POST", {}); } catch { /* da igual: el token local se borra igual */ }
  setSessionToken(null);
  await refreshSession();
}

/** Lee el token que trae el enlace mágico en el fragmento y limpia la barra de direcciones. */
export function consumeAuthHash(): "ok" | "expired" | "error" | null {
  const m = location.hash.match(/^#auth=(.+)$/);
  if (!m) return null;
  const value = decodeURIComponent(m[1]);
  history.replaceState(null, "", location.pathname + location.search);
  if (value === "expired") return "expired";
  if (value === "error") return "error";
  setSessionToken(value);
  return "ok";
}
