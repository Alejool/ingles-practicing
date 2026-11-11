import { test, expect } from "./fixtures.ts";

/**
 * La landing funciona sin conexión una vez cargada (landing-y-acceso 3.16, AC-7):
 * service worker activo, red cortada, recarga y las cuatro actividades.
 */

test.use({
  serviceWorkers: "allow",
  manejadores: { "GET /api/auth/session": () => ({ status: 200, body: { user: null, quota: null, accounts: true } }) },
});

test("cargada una vez, sin red se recarga y se juega entera; el formulario dice que hace falta red", async ({ page, context }) => {
  // Las fuentes las pide el service worker, fuera de `page.route`: se sirven vacías.
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        speaking: false, pending: false, getVoices: () => [], addEventListener: () => {}, removeEventListener: () => {}, cancel: () => {},
        speak: (u: SpeechSynthesisUtterance) => setTimeout(() => u.onend?.(new Event("end") as SpeechSynthesisEvent), 5),
      },
    });
  });

  await page.goto("/bienvenida/");
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    // Espera a que el esqueleto esté en la caché (la instalación lo descarga entero).
    for (let i = 0; i < 100 && !(await caches.keys()).some(k => k.endsWith("-shell")); i++) await new Promise(r => setTimeout(r, 100));
    return reg.active?.state;
  });
  await expect.poll(() => page.evaluate(async () => {
    const k = (await caches.keys()).find(n => n.endsWith("-shell"));
    return k ? !!(await (await caches.open(k)).match("/bienvenida/index.html", { ignoreSearch: true })) : false;
  })).toBe(true);

  await context.setOffline(true);
  // Sin red, la API tampoco responde.
  await page.route("**/api/**", (r) => r.abort("internetdisconnected"));
  await page.reload();
  await expect(page.locator("h1")).toHaveText("Llega al B1 o al B2 en 24 semanas, con 45 minutos al día");
  await expect(page.getByText("Sin conexión: para entrar necesitas internet.")).toBeVisible();

  const cuerpo = page.locator("#pruebaCuerpo");
  // Diagnóstico
  await cuerpo.locator(".l-ans").first().click();
  await expect(cuerpo.locator(".l-fb")).toBeVisible();
  // Tarjetas
  await page.getByRole("button", { name: "Empezar las tarjetas de vocabulario" }).click();
  await cuerpo.getByRole("button", { name: "Lo sé", exact: true }).click();
  await expect(cuerpo.locator(".l-fb")).toContainText("=");
  // Escucha
  await page.getByRole("button", { name: "Empezar la escucha en tres pases" }).click();
  await cuerpo.getByRole("button", { name: "Escuchar: idea general" }).click();
  await expect(cuerpo.locator(".l-qs")).toBeVisible();
  // Use of English
  await page.getByRole("button", { name: "Empezar Use of English" }).click();
  await cuerpo.getByRole("textbox").fill("last time I saw");
  await cuerpo.getByRole("button", { name: "Comprobar" }).click();
  await expect(cuerpo.locator(".l-fb")).toContainText("Correcta");

  await context.setOffline(false);
});
