import type { Page } from "@playwright/test";

import { test, expect } from "./fixtures.ts";

/**
 * Guardián de la app (landing-y-acceso 3.2, AC-1): sin sesión, cualquier URL de
 * la app acaba en la landing antes de cargar nada de la app; con token o con un
 * marcador de cuenta sin salida, se queda en la app. Simétrico en la landing.
 */

const SESION = "ruta-b1b2-session";
const CUENTA = "ruta-b1b2-cuenta";

/** Siembra `localStorage` antes de cualquier script de la página (incluido el guardián). */
async function sembrar(page: Page, datos: Record<string, string>): Promise<void> {
  await page.addInitScript((d) => {
    for (const [k, v] of Object.entries(d)) localStorage.setItem(k, v);
  }, datos);
}

/**
 * Peticiones a los bundles de la app. La entrada de `index.astro` (`arranque.ts`,
 * unas líneas) la pide el navegador al ver la etiqueta, antes de que el guardián
 * termine de irse; lo que no puede pedirse es la app (`main` y lo que importa).
 */
function vigilarBundles(page: Page): string[] {
  const vistos: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.pathname.endsWith(".js") && /\/(main|state|nav|sync|track)\./.test(u.pathname)) vistos.push(u.pathname);
  });
  return vistos;
}

async function enLanding(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/bienvenida\/(#.*)?$/);
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".app, #main, .rail")).toHaveCount(0);
}

for (const ruta of ["/", "/#plan", "/#cuenta", "/#ajustes"]) {
  test(`sin sesión, ${ruta} acaba en la landing sin pedir la app`, async ({ page }) => {
    const bundles = vigilarBundles(page);
    await page.goto(ruta);
    await enLanding(page);
    expect(bundles, "bundles de la app pedidos").toEqual([]);
  });
}

test("con token se queda en la app", async ({ page }) => {
  await sembrar(page, { [SESION]: "tok-guardia" });
  await page.goto("/#plan");
  await expect(page).toHaveURL(/\/#plan$/);
  await expect(page.locator(".app")).toBeAttached();
});

test("con marcador de cuenta activo y sin token se queda en la app (sesión caducada sin red)", async ({ page }) => {
  await sembrar(page, { [CUENTA]: JSON.stringify({ v: 1, id: "0123456789abcdef", salida: null }) });
  await page.goto("/");
  await expect(page.locator(".app")).toBeAttached();
  await expect(page).not.toHaveURL(/bienvenida/);
});

test("con marcador de quien salió vuelve a la landing", async ({ page }) => {
  await sembrar(page, { [CUENTA]: JSON.stringify({ v: 1, id: "0123456789abcdef", salida: "2026-11-07T08:00:00.000Z" }) });
  await page.goto("/");
  await enLanding(page);
});

test("un marcador ilegible cuenta como ausente", async ({ page }) => {
  await sembrar(page, { [CUENTA]: "{roto" });
  await page.goto("/");
  await enLanding(page);
});

test("el enlace mágico con token entra en la app", async ({ page }) => {
  await page.goto("/#auth=tok-nuevo");
  await expect(page.locator(".app")).toBeAttached();
  await expect(page).not.toHaveURL(/bienvenida/);
});

test("enlace caducado → landing con #acceso=caducado", async ({ page }) => {
  await page.goto("/#auth=expired");
  await expect(page).toHaveURL(/\/bienvenida\/#acceso=caducado$/);
});

test("enlace con error → landing con #acceso=error", async ({ page }) => {
  await page.goto("/#auth=error");
  await expect(page).toHaveURL(/\/bienvenida\/#acceso=error$/);
});

test("en la landing con token pasa a la app", async ({ page }) => {
  await sembrar(page, { [SESION]: "tok-guardia" });
  await page.goto("/bienvenida/");
  await expect(page).not.toHaveURL(/bienvenida/);
  await expect(page.locator(".app")).toBeAttached();
});

test("en la landing con marcador de cuenta activo (sin token) pasa a la app, como el guardián", async ({ page }) => {
  await sembrar(page, { [CUENTA]: JSON.stringify({ v: 1, id: "0123456789abcdef", salida: null }) });
  await page.goto("/bienvenida/");
  await expect(page).not.toHaveURL(/bienvenida/);
  await expect(page.locator(".app")).toBeAttached();
});

test("un marcador con salida que no es texto ni null cuenta como ausente", async ({ page }) => {
  await sembrar(page, { [CUENTA]: JSON.stringify({ v: 1, id: "0123456789abcdef", salida: 5 }) });
  await page.goto("/");
  await enLanding(page);
});
