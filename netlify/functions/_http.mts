/** Utilidades compartidas por las funciones: CORS, respuestas, IP y errores. */

const ORIGINS = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allow =
    ORIGINS.includes("*") ? "*" :
    ORIGINS.includes(origin) ? origin :
    ORIGINS[0] || "";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Device-Id",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function preflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

export function json(req: Request, body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra },
  });
}

/**
 * Error con un `code` estable que el front traduce a un mensaje.
 * Nunca devolvemos el detalle interno al cliente.
 */
export class ApiError extends Error {
  status: number;
  code: string;
  extra: Record<string, unknown>;
  constructor(status: number, code: string, message = "", extra: Record<string, unknown> = {}) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export function fail(req: Request, e: unknown): Response {
  if (e instanceof ApiError) {
    return json(req, { error: { code: e.code, message: e.message, ...e.extra } }, e.status);
  }
  console.error("[api] error inesperado", e);
  return json(req, { error: { code: "server_error", message: "Error interno" } }, 500);
}

/**
 * Dónde está corriendo esto. Se mira en variables que pone la propia
 * plataforma, nunca en la petición: una cabecera la escribe quien quiera.
 * `PLATAFORMA_API` la fija `server/index.mts` al arrancar, y por eso manda.
 */
function plataforma(): "node" | "vercel" | "netlify" | "" {
  const env = process.env;
  if (env.PLATAFORMA_API === "node") return "node";
  if (env.VERCEL) return "vercel";
  if (env.NETLIFY || env.NETLIFY_DEV || env.SITE_ID || "Netlify" in globalThis) return "netlify";
  return "";
}

/**
 * IP del cliente, leída solo de la cabecera que escribe la plataforma en la que
 * estamos. `X-Forwarded-For` la manda el cliente y no se mira nunca aquí: con
 * ella bastaba cambiar un valor para estrenar cuota en cada petición.
 *
 * En una plataforma que no se reconoce no hay cabecera de fiar: todo el mundo
 * cae en la misma IP, que es compartir cupo pero no regalarlo.
 */
export function clientIp(req: Request): string {
  const h = req.headers;
  const donde = plataforma();
  const ip =
    // Netlify la escribe en su borde; en Docker la pisa `server/index.mts`.
    donde === "netlify" || donde === "node" ? h.get("x-nf-client-connection-ip") :
    donde === "vercel" ? h.get("x-vercel-forwarded-for") || h.get("x-real-ip") :
    "";
  return (ip || "").split(",")[0].trim() || "0.0.0.0";
}

/**
 * IP del cliente en el servidor propio, a partir del socket.
 *
 * `saltos` es cuántos proxies nuestros hay delante (TRUST_PROXY). Cada uno
 * añade al final de `X-Forwarded-For` la IP que vio de verdad, así que la del
 * cliente es la que queda tras descontar esos saltos desde la derecha. Lo que
 * haya más a la izquierda lo pudo escribir el cliente y no cuenta.
 */
export function ipDeProxy(remoto: string, reenviado: string, saltos: number): string {
  const limpia = (s: string) => s.trim().replace(/^::ffff:/, "");
  const socket = limpia(remoto) || "0.0.0.0";
  if (saltos <= 0) return socket;
  const cadena = [...reenviado.split(",").map(limpia).filter(Boolean), socket];
  return cadena[Math.max(0, cadena.length - 1 - saltos)];
}

/** Hash con pimienta: identifica sin guardar la IP en claro. */
export async function hashIp(ip: string): Promise<string> {
  return sha256Hex(ip + "|" + (process.env.IP_PEPPER || "ruta-b1b2"));
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 32): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function num(name: string, def: number): number {
  const v = parseInt(process.env[name] || "", 10);
  return Number.isFinite(v) ? v : def;
}

/** Lee el cuerpo JSON con un tope de tamaño. */
export async function readJson(req: Request, maxBytes = 96 * 1024): Promise<any> {
  const text = await req.text();
  if (text.length > maxBytes) throw new ApiError(413, "payload_too_large", "El texto enviado es demasiado largo.");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError(400, "bad_json", "JSON inválido.");
  }
}

export function deviceId(req: Request, body?: any): string {
  const raw = String(req.headers.get("x-device-id") || body?.device_id || "").trim();
  return /^[A-Za-z0-9_-]{8,64}$/.test(raw) ? raw : "";
}

/**
 * Decide a qué origen devolver tras el enlace mágico.
 *
 * Solo se acepta un origen conocido: el de APP_URL, uno de ALLOWED_ORIGINS, o
 * —cuando APP_URL ya es local— cualquier puerto de localhost, que es el caso de
 * `astro dev` en :4321. Cualquier otra cosa cae en APP_URL. Sin esta lista
 * blanca esto sería un redirect abierto.
 */
export function safeReturnTo(origin: string | null): string | null {
  if (!origin) return null;
  let candidate: URL;
  try { candidate = new URL(origin); } catch { return null; }
  const clean = candidate.origin;

  const appUrl = process.env.APP_URL || "";
  let appOrigin = "";
  try { appOrigin = new URL(appUrl).origin; } catch { /* APP_URL sin definir */ }
  if (appOrigin && clean === appOrigin) return clean;

  const allowed = (process.env.ALLOWED_ORIGINS || "")
    .split(",").map(o => o.trim()).filter(Boolean);
  if (allowed.includes(clean)) return clean;

  const isLocal = (h: string) => h === "localhost" || h === "127.0.0.1" || h === "[::1]";
  if (appOrigin && isLocal(new URL(appOrigin).hostname) && isLocal(candidate.hostname)) return clean;

  return null;
}
