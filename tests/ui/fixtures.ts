import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { test as base, expect } from "@playwright/test";

import { simularApi, type ApiSimulada, type Manejadores } from "./fake-api.ts";

/**
 * Test extendido de la suite de interfaz.
 * - `api`: la API simulada (automática). Ampliable por archivo con
 *   `test.use({ manejadores: { "GET /api/x": () => ({ status: 200, body: … }) } })`.
 * - `progresoReal`: con `test.use({ progresoReal: true })`, `localStorage` arranca
 *   con `tests/fixtures/progreso-local-real.json` antes de abrir la app.
 * - Al terminar cada test falla si hubo errores de consola, excepciones de
 *   página, peticiones a `/api/**` sin simular o peticiones a terceros.
 * - Tema: `test.use({ colorScheme: "dark" })` (o `TEMAS` para recorrer los dos).
 *   Si el progreso cargado trae `theme`, ese manda, como en la app.
 */

export const TEMAS = ["light", "dark"] as const;

export const CLAVE_ESTADO = "ruta-b1b2-v1";
export const FIXTURE_PROGRESO = fileURLToPath(new URL("../fixtures/progreso-local-real.json", import.meta.url));

/** Página vacía del mismo origen donde se siembra `localStorage` sin que arranque la app. */
const SEMILLA = "/__semilla-tests__";

/** Fuentes de Google (las quita la tarea 2.5): se sirven vacías para no depender de la red. */
const FUENTES_GOOGLE = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

export async function leerProgresoReal(): Promise<unknown> {
  let texto: string;
  try {
    texto = await readFile(FIXTURE_PROGRESO, "utf8");
  } catch (e) {
    throw new Error(`Falta ${FIXTURE_PROGRESO} (tarea 1.6 de specs/rediseno-limpio): ${(e as Error).message}`);
  }
  return JSON.parse(texto);
}

type Opciones = { progresoReal: boolean; manejadores: Manejadores };
type Fijos = { api: ApiSimulada; vigilancia: void };

export const test = base.extend<Opciones & Fijos>({
  progresoReal: [false, { option: true }],
  manejadores: [{}, { option: true }],

  api: [
    async ({ page, manejadores }, use) => {
      await use(await simularApi(page, manejadores));
    },
    { auto: true },
  ],

  vigilancia: [
    async ({ page, baseURL, progresoReal, api }, use) => {
      const errores: string[] = [];
      const terceros: string[] = [];
      const origen = new URL(baseURL ?? "").origin;

      page.on("pageerror", (e) => errores.push(`excepción: ${e.message}`));
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        const url = m.location().url;
        // Los 404/5xx de /api/** los decide la API simulada; los no simulados ya se cuentan aparte.
        if (m.text().startsWith("Failed to load resource") && url.startsWith(`${origen}/api/`)) return;
        errores.push(`consola: ${m.text()}${url ? ` (${url})` : ""}`);
      });

      await page.route(
        (url) => url.origin !== origen,
        async (route) => {
          const url = route.request().url();
          if (FUENTES_GOOGLE.test(url)) {
            await route.fulfill({ status: 200, contentType: "text/css", body: "" });
            return;
          }
          terceros.push(url);
          await route.abort("blockedbyclient");
        },
      );

      if (progresoReal) {
        const progreso = await leerProgresoReal();
        await page.route(`**${SEMILLA}`, (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>semilla</title>" }));
        await page.goto(SEMILLA);
        await page.evaluate(([clave, valor]) => localStorage.setItem(clave, valor), [CLAVE_ESTADO, JSON.stringify(progreso)] as const);
        await page.unroute(`**${SEMILLA}`);
      }

      await use();

      expect(api.noSimuladas, "peticiones a /api sin simular").toEqual([]);
      expect(terceros, "peticiones a terceros").toEqual([]);
      expect(errores, "errores en la página").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
