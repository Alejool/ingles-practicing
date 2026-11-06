import type { Page, Request } from "@playwright/test";

/**
 * API simulada con `page.route` (plan R-4). Por defecto: instalación sin
 * cuentas, cuota anónima, sin progreso en el servidor y biblioteca sin
 * textos nuevos. Cualquier otra
 * petición a `/api/**` responde 404 y queda en `noSimuladas`; el test
 * extendido de `fixtures.ts` falla si al final hay alguna.
 *
 * Para ampliarla (otra feature, otro caso), pasar manejadores con la clave
 * "MÉTODO /api/ruta" (sin query); sustituyen a los de base con la misma clave.
 */

export type Respuesta = { status: number; body?: unknown };
export type Manejador = (peticion: Request) => Respuesta;
export type Manejadores = Record<string, Manejador>;

export const CUOTA_ANONIMA = {
  authenticated: false,
  used: 0,
  limit: 5,
  remaining: 5,
  window: "total",
  resetsAt: null,
  globalRemaining: 100,
} as const;

const sesionSinCuentas: Manejador = () => ({
  status: 200,
  body: { user: null, quota: CUOTA_ANONIMA, accounts: false },
});

export const MANEJADORES_BASE: Manejadores = {
  "GET /api/auth/session": sesionSinCuentas,
  "GET /api/quota": sesionSinCuentas,
  "GET /api/progress": () => ({ status: 404, body: { error: { code: "not_found", message: "Sin progreso guardado" } } }),
  // La biblioteca compartida se pide al arrancar; sin textos nuevos, como en la llamada habitual.
  "GET /api/readings": () => ({ status: 200, body: { textos: [] } }),
};

export type ApiSimulada = {
  /** Todas las peticiones a `/api/**`, en orden: "MÉTODO /api/ruta?query". */
  peticiones: string[];
  /** Las que no tenían manejador. */
  noSimuladas: string[];
};

export async function simularApi(page: Page, extra: Manejadores = {}): Promise<ApiSimulada> {
  const manejadores = { ...MANEJADORES_BASE, ...extra };
  const registro: ApiSimulada = { peticiones: [], noSimuladas: [] };
  await page.route("**/api/**", async (route) => {
    const peticion = route.request();
    const url = new URL(peticion.url());
    const completa = `${peticion.method()} ${url.pathname}${url.search}`;
    registro.peticiones.push(completa);
    const manejador = manejadores[`${peticion.method()} ${url.pathname}`];
    if (!manejador) {
      registro.noSimuladas.push(completa);
      await route.fulfill({ status: 404, json: { error: { code: "not_simulated", message: `Sin simular: ${completa}` } } });
      return;
    }
    const { status, body } = manejador(peticion);
    await route.fulfill(body === undefined ? { status } : { status, json: body });
  });
  return registro;
}
