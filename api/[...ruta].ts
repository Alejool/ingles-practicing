/**
 * Adaptador para Vercel.
 *
 * Las funciones de `netlify/functions` son handlers estándar de la web
 * (`Request` → `Response`), así que no hay que reescribir ninguna: este archivo
 * es lo único específico de Vercel y se limita a mirar la ruta y llamar a la
 * que toca. El mismo código corre en Netlify, en Docker (`server/index.mts`)
 * y aquí.
 *
 * Los imports son explícitos, uno por endpoint, a propósito: leer la carpeta en
 * tiempo de ejecución funciona en local, pero el empaquetador de Vercel no
 * incluiría esos archivos y en producción no habría ninguna ruta. Si añades un
 * endpoint, añádelo también a esta lista.
 */

import admin, { config as cAdmin } from "../netlify/functions/admin.mts";
import aiChat, { config as cAiChat } from "../netlify/functions/ai-chat.mts";
import authRequest, { config as cAuthRequest } from "../netlify/functions/auth-request.mts";
import authSession, { config as cAuthSession } from "../netlify/functions/auth-session.mts";
import authVerify, { config as cAuthVerify } from "../netlify/functions/auth-verify.mts";
import health, { config as cHealth } from "../netlify/functions/health.mts";
import progress, { config as cProgress } from "../netlify/functions/progress.mts";
import pulse, { config as cPulse } from "../netlify/functions/pulse.mts";
import quota, { config as cQuota } from "../netlify/functions/quota.mts";
import readings, { config as cReadings } from "../netlify/functions/readings.mts";

type Handler = (req: Request) => Promise<Response> | Response;

const RUTAS: Array<[string, Handler]> = [
  [cAdmin.path, admin],
  [cAiChat.path, aiChat],
  [cAuthRequest.path, authRequest],
  [cAuthSession.path, authSession],
  [cAuthVerify.path, authVerify],
  [cHealth.path, health],
  [cProgress.path, progress],
  [cPulse.path, pulse],
  [cQuota.path, quota],
  [cReadings.path, readings],
];

/**
 * Vercel puede entregar la petición con la ruta reescrita (`/healthz` llega
 * como `/api/healthz`), así que se prueba tal cual y, si no, por el final.
 */
function buscar(pathname: string): Handler | undefined {
  const limpio = (pathname.replace(/\/+$/, "") || "/").toLowerCase();
  const exacta = RUTAS.find(([p]) => p.toLowerCase() === limpio);
  if (exacta) return exacta[1];
  return RUTAS.find(([p]) => limpio.endsWith(p.toLowerCase()))?.[1];
}

export default async function handler(req: Request): Promise<Response> {
  const cabeceras = { "Content-Type": "application/json", "Cache-Control": "no-store" };
  try {
    const fn = buscar(new URL(req.url).pathname);
    if (!fn) {
      return new Response(
        JSON.stringify({ error: { code: "not_found", message: "Ese endpoint no existe." } }),
        { status: 404, headers: cabeceras });
    }
    return await fn(req);
  } catch (e: any) {
    // Nunca se devuelve el detalle del error al cliente: va a los logs de Vercel.
    console.error("[api]", e);
    return new Response(
      JSON.stringify({ error: { code: "server_error", message: "Algo falló en el servidor." } }),
      { status: 500, headers: cabeceras });
  }
}

/** Las correcciones llegan por streaming y pueden tardar: 60 s de margen. */
export const config = { maxDuration: 60 };
