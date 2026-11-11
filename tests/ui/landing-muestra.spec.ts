import type { Page } from "@playwright/test";

import { test, expect } from "./fixtures.ts";

/**
 * La muestra jugable de la landing (landing-y-acceso 3.8; AC-3, AC-4, AC-5, AC-6):
 * cuatro actividades reales con corrección inmediata, nada guardado salvo el
 * resultado del diagnóstico en `sessionStorage`, ninguna llamada con coste.
 */

test.use({ manejadores: { "GET /api/auth/session": () => ({ status: 200, body: { user: null, quota: null, accounts: true } }) } });

const CON_COSTE = /\/api\/(ai|pulse|progress|readings|harness|learner)\b|deepseek/i;
const CLAVE_RELEVO = "ruta-muestra-diag";

/** `speechSynthesis` falso: cada frase "suena" al instante y se apunta. */
async function vozFalsa(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const dichas: string[] = [];
    (window as unknown as { __dichas: string[] }).__dichas = dichas;
    const voz = {
      speaking: false, pending: false, paused: false,
      getVoices: () => [],
      addEventListener: () => {}, removeEventListener: () => {},
      cancel: () => {}, pause: () => {}, resume: () => {},
      speak: (u: SpeechSynthesisUtterance) => {
        dichas.push(u.text);
        setTimeout(() => { u.onstart?.(new Event("start") as SpeechSynthesisEvent); u.onend?.(new Event("end") as SpeechSynthesisEvent); }, 5);
      },
    };
    Object.defineProperty(window, "speechSynthesis", { value: voz, configurable: true });
  });
}

async function sinVoz(page: Page): Promise<void> {
  await page.addInitScript(() => {
    delete (Window.prototype as unknown as Record<string, unknown>).speechSynthesis;
    delete (window as unknown as Record<string, unknown>).speechSynthesis;
  });
}

type Foto = { local: Record<string, string>; sesion: Record<string, string>; idb: string[]; cookies: string };

async function foto(page: Page): Promise<Foto> {
  return page.evaluate(async () => {
    const volcar = (s: Storage) => Object.fromEntries(Array.from({ length: s.length }, (_, i) => s.key(i)!).map(k => [k, s.getItem(k)!]));
    const idb = indexedDB.databases ? (await indexedDB.databases()).map(d => d.name ?? "") : [];
    return { local: volcar(localStorage), sesion: volcar(sessionStorage), idb, cookies: document.cookie };
  });
}

function vigilarPeticiones(page: Page): string[] {
  const conCoste: string[] = [];
  page.on("request", (r) => { if (CON_COSTE.test(r.url())) conCoste.push(r.url()); });
  return conCoste;
}

const cuerpo = (page: Page) => page.locator("#pruebaCuerpo");

/** Contesta las diez preguntas: la primera opción de cada una. */
async function hacerDiagnostico(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Empezar el diagnóstico completo" }).click();
  for (let i = 1; i <= 10; i++) {
    await expect(page.locator("#pruebaT")).toContainText(`pregunta ${i} de 10`);
    await cuerpo(page).locator(".l-ans").first().click();
    await expect(cuerpo(page).locator(".l-fb")).toBeVisible();
    await cuerpo(page).getByRole("button", { name: i < 10 ? "Siguiente pregunta" : "Ver mi resultado" }).click();
  }
}

async function finDeActividad(page: Page): Promise<void> {
  // Resultado concreto + "Entrar con tu correo" (secundario) sin bloquear seguir probando.
  await expect(cuerpo(page).locator(".l-gain")).toContainText("guardas el progreso");
  await expect(cuerpo(page).locator(".l-gain")).toContainText("plan de 24 semanas");
  await expect(cuerpo(page).locator(".l-gain")).toContainText("seguimiento personal");
  await expect(cuerpo(page).locator(".l-gain")).toContainText("agente");
  const entrar = cuerpo(page).getByRole("button", { name: "Entrar con tu correo" });
  await expect(entrar).toHaveClass(/l-btn-secondary/);
  await expect(cuerpo(page).getByRole("button", { name: "Probar otra actividad" })).toBeEnabled();
}

test("diagnóstico de diez preguntas: corrección inmediata, resultado por área y repaso", async ({ page }) => {
  await page.goto("/bienvenida/");
  await hacerDiagnostico(page);
  await expect(cuerpo(page).locator(".l-score")).toHaveText(/^\d+ de 10$/);
  await expect(cuerpo(page).locator(".l-res li").first()).toBeVisible();
  await expect(cuerpo(page).locator(".l-res [data-banda]").first()).toHaveText(/por debajo|en el nivel|por encima/);
  await cuerpo(page).getByText("Repasar las diez preguntas").click();
  await expect(cuerpo(page).locator(".l-repaso li")).toHaveCount(10);
  await finDeActividad(page);
});

test("cambiar de ruta da las diez preguntas de A2 → B1", async ({ page }) => {
  await page.goto("/bienvenida/");
  await page.getByText("A2 → B1", { exact: true }).click();
  await expect(page.locator("#pruebaT")).toContainText("A2 → B1");
  await expect(page.locator("#pruebaT")).toContainText("pregunta 1 de 10");
});

test("tarjetas: lo sé / no lo sé con la traducción, y el resultado", async ({ page }) => {
  await page.goto("/bienvenida/");
  await page.getByRole("button", { name: "Empezar las tarjetas de vocabulario" }).click();
  for (let i = 1; i <= 8; i++) {
    await expect(page.locator("#pruebaChip")).toHaveText(`Tarjeta ${i} de 8`);
    await cuerpo(page).getByRole("button", { name: i % 2 ? "Lo sé" : "No lo sé", exact: true }).click();
    await expect(cuerpo(page).locator(".l-fb")).toContainText("=");
    await cuerpo(page).getByRole("button", { name: i < 8 ? "Siguiente tarjeta" : "Ver cómo te fue" }).click();
  }
  await expect(cuerpo(page).locator(".l-score")).toHaveText("4 de 8");
  await finDeActividad(page);
});

test("escucha: tres pases con voz, preguntas tras el primero, transcripción tras el segundo", async ({ page }) => {
  await vozFalsa(page);
  await page.goto("/bienvenida/");
  await page.getByRole("button", { name: "Empezar la escucha en tres pases" }).click();
  await expect(cuerpo(page).locator(".l-qs")).toHaveCount(0);
  await cuerpo(page).getByRole("button", { name: "Escuchar: idea general" }).click();
  await expect(cuerpo(page).locator(".l-qs")).toBeVisible();
  await expect(cuerpo(page).locator(".l-script")).toHaveCount(0);
  await cuerpo(page).getByRole("button", { name: "Escuchar otra vez: detalle" }).click();
  await expect(cuerpo(page).locator(".l-script")).toBeVisible();
  await cuerpo(page).getByRole("button", { name: "Escuchar con la transcripción" }).click();
  await expect(page.locator("#pruebaChip")).toHaveText("3 pases hechos");
  expect(await page.evaluate(() => (window as unknown as { __dichas: string[] }).__dichas.length)).toBeGreaterThan(3);

  const preguntas = cuerpo(page).locator(".l-qs > li");
  const n = await preguntas.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    await preguntas.nth(i).locator(".l-ans").first().click();
    await expect(preguntas.nth(i).locator("[data-mark]").first()).toBeVisible();
  }
  await finDeActividad(page);
});

test("escucha sin voz inglesa: aviso y transcripción visible desde el principio", async ({ page }) => {
  await sinVoz(page);
  await page.goto("/bienvenida/");
  await page.getByRole("button", { name: "Empezar la escucha en tres pases" }).click();
  await expect(cuerpo(page).getByText("Tu navegador no tiene voz")).toBeVisible();
  await expect(cuerpo(page).locator(".l-script")).toBeVisible();
  await expect(cuerpo(page).locator(".l-qs")).toBeVisible();
});

test("Use of English: vacío avisa en el campo; respuesta corregida al momento", async ({ page }) => {
  await page.goto("/bienvenida/");
  await page.getByRole("button", { name: "Empezar Use of English" }).click();
  const campo = cuerpo(page).getByRole("textbox");
  await cuerpo(page).getByRole("button", { name: "Comprobar" }).click();
  await expect(campo).toHaveAttribute("aria-invalid", "true");
  await expect(campo).toBeFocused();
  await campo.fill("Last Time I Saw");
  await cuerpo(page).getByRole("button", { name: "Comprobar" }).click();
  await expect(cuerpo(page).locator(".l-fb")).toContainText("Correcta");
  await finDeActividad(page);
});

test("Use of English: una respuesta mal da «Todavía no» y la explicación", async ({ page }) => {
  await page.goto("/bienvenida/");
  await page.getByRole("button", { name: "Empezar Use of English" }).click();
  await cuerpo(page).getByRole("textbox").fill("since i saw");
  await cuerpo(page).getByRole("button", { name: "Comprobar" }).click();
  await expect(cuerpo(page).locator(".l-fb")).toContainText("Todavía no");
});

test("«Entrar con tu correo» tras una actividad lleva al campo de correo", async ({ page }) => {
  await page.goto("/bienvenida/");
  await page.getByRole("button", { name: "Empezar Use of English" }).click();
  await cuerpo(page).getByRole("textbox").fill("x");
  await cuerpo(page).getByRole("button", { name: "Comprobar" }).click();
  await cuerpo(page).getByRole("button", { name: "Entrar con tu correo" }).click();
  await expect(page.getByLabel("Tu correo")).toBeFocused();
});

test("nada se guarda salvo el diagnóstico en sessionStorage; recargar empieza de cero; cero peticiones con coste", async ({ page }) => {
  await vozFalsa(page);
  const conCoste = vigilarPeticiones(page);
  await page.goto("/bienvenida/");
  const antes = await foto(page);

  await hacerDiagnostico(page);
  await page.getByRole("button", { name: "Empezar las tarjetas de vocabulario" }).click();
  await cuerpo(page).getByRole("button", { name: "Lo sé", exact: true }).click();
  await page.getByRole("button", { name: "Empezar la escucha en tres pases" }).click();
  await cuerpo(page).getByRole("button", { name: "Escuchar: idea general" }).click();
  await cuerpo(page).locator(".l-qs .l-ans").first().click();
  await page.getByRole("button", { name: "Empezar Use of English" }).click();
  await cuerpo(page).getByRole("textbox").fill("last time i saw");
  await cuerpo(page).getByRole("button", { name: "Comprobar" }).click();

  const despues = await foto(page);
  const { [CLAVE_RELEVO]: relevo, ...restoSesion } = despues.sesion;
  expect(relevo, "el diagnóstico queda en sessionStorage").toBeTruthy();
  expect(JSON.parse(relevo)).toMatchObject({ v: 1, track: "b1b2" });
  expect({ ...despues, sesion: restoSesion }).toEqual(antes);

  await page.reload();
  // El diagnóstico se ve con su nota y el aviso de que se pierde al cerrar la pestaña.
  await expect(cuerpo(page).locator(".l-score")).toHaveText(/^\d+ de 10$/);
  await expect(cuerpo(page)).toContainText("se pierde al cerrar la pestaña");
  // Lo demás empieza de cero.
  await page.getByRole("button", { name: "Empezar las tarjetas de vocabulario" }).click();
  await expect(page.locator("#pruebaChip")).toHaveText("Tarjeta 1 de 8");
  await page.getByRole("button", { name: "Empezar Use of English" }).click();
  await expect(cuerpo(page).getByRole("textbox")).toHaveValue("");

  expect(conCoste, "peticiones con coste desde la landing").toEqual([]);
});
