import type { Page, Request } from "@playwright/test";

import { test, expect } from "./fixtures.ts";
import type { Manejadores, Respuesta } from "./fake-api.ts";

/**
 * Entrar desde la landing (landing-y-acceso 3.14; AC-8, AC-10, AC-11): un solo
 * flujo para cuenta nueva y existente; cada error con su mensaje, sin perder lo
 * escrito; sin identificador de dispositivo.
 */

const CORREO = "ana.garcia@correo.com";

const sesionConCuentas = (): Respuesta => ({ status: 200, body: { user: null, quota: null, accounts: true } });
const error = (status: number, code: string, message: string) => (): Respuesta =>
  ({ status, body: { error: { code, message } } });

function con(pedirEnlace: (r: Request) => Respuesta): Manejadores {
  return { "GET /api/auth/session": sesionConCuentas, "POST /api/auth/request": pedirEnlace };
}

/** Ninguna petición lleva X-Device-Id y la landing no crea `ruta-b1b2-device`. */
function vigilarDispositivo(page: Page): string[] {
  const con: string[] = [];
  page.on("request", (r) => { if (r.headers()["x-device-id"]) con.push(r.url()); });
  return con;
}

async function enviar(page: Page, correo = CORREO): Promise<void> {
  await page.getByLabel("Tu correo").fill(correo);
  await page.getByRole("button", { name: "Entrar con tu correo" }).click();
}

async function errorEnCampo(page: Page, texto: RegExp | string): Promise<void> {
  const campo = page.getByLabel("Tu correo");
  await expect(campo).toHaveAttribute("aria-invalid", "true");
  await expect(campo).toHaveAttribute("aria-describedby", /lmailErr/);
  await expect(page.locator("#lmailErr")).toBeVisible();
  await expect(page.locator("#lmailErr")).toContainText(texto);
  await expect(page.locator("#lmailErr")).toHaveAttribute("role", "alert");
}

test.describe("con cuentas", () => {
  let pedidas: unknown[] = [];
  test.use({
    manejadores: con((r) => { pedidas.push(r.postDataJSON()); return { status: 200, body: { ok: true, minutes: 15, delivery: "email" } }; }),
  });
  test.beforeEach(() => { pedidas = []; });

  test("correo inválido: aviso en el cliente, sin petición y sin vaciar el campo", async ({ page }) => {
    await page.goto("/bienvenida/");
    await enviar(page, "ana@correo");
    await errorEnCampo(page, "Falta el dominio completo");
    await expect(page.getByLabel("Tu correo")).toHaveValue("ana@correo");
    await expect(page.getByLabel("Tu correo")).toBeFocused();
    expect(pedidas).toEqual([]);
    await page.getByLabel("Tu correo").fill("ana@correo.com");
    await expect(page.getByLabel("Tu correo")).not.toHaveAttribute("aria-invalid", "true");
  });

  test("vacío: pide el correo", async ({ page }) => {
    await page.goto("/bienvenida/");
    await page.getByRole("button", { name: "Entrar con tu correo" }).click();
    await errorEnCampo(page, "Escribe tu correo");
  });

  test("éxito: «Revisa tu correo» con la dirección; mismo flujo para cuenta nueva o existente; sin dispositivo", async ({ page }) => {
    const conDispositivo = vigilarDispositivo(page);
    await page.goto("/bienvenida/");
    await enviar(page);
    await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();
    await expect(page.locator("#enviado")).toContainText(CORREO);
    await expect(page.locator("#enviado")).toContainText("15 minutos");
    expect(pedidas).toEqual([{ email: CORREO }]);
    await page.getByRole("button", { name: "Usar otro correo" }).click();
    await expect(page.getByLabel("Tu correo")).toHaveValue(CORREO);
    expect(conDispositivo).toEqual([]);
    expect(await page.evaluate(() => localStorage.getItem("ruta-b1b2-device"))).toBeNull();
  });

  test("reenviar pide otro enlace y lo anuncia", async ({ page }) => {
    await page.goto("/bienvenida/");
    await enviar(page);
    await page.getByRole("button", { name: "Reenviar el enlace" }).click();
    await expect(page.locator("#anuncio")).toContainText("otro enlace");
    expect(pedidas).toHaveLength(2);
  });

  test("#acceso=caducado → aviso de enlace caducado", async ({ page }) => {
    await page.goto("/bienvenida/#acceso=caducado");
    await expect(page.getByText("Ese enlace caducó o ya se usó.")).toBeVisible();
  });

  test("#acceso=error → aviso de entrada no completada", async ({ page }) => {
    await page.goto("/bienvenida/#acceso=error");
    await expect(page.getByText("No se pudo completar la entrada.")).toBeVisible();
  });
});

test.describe("buzón local de desarrollo", () => {
  test.use({ manejadores: con(() => ({ status: 200, body: { ok: true, minutes: 15, delivery: "mailbox", mailboxUrl: "http://localhost:8025" } })) });
  test("lo dice y enlaza el buzón", async ({ page }) => {
    await page.goto("/bienvenida/");
    await enviar(page);
    await expect(page.getByRole("link", { name: "Abrir el buzón" })).toHaveAttribute("href", "http://localhost:8025");
  });
});

for (const [nombre, status, code, msg, esperado] of [
  ["422 bad_email", 422, "bad_email", "Ese correo no parece válido.", "Ese correo no parece válido"],
  ["502 mail_failed", 502, "mail_failed", "No se pudo enviar.", "No pudimos enviar el correo"],
  ["429 too_many_links", 429, "too_many_links", "Demasiados enlaces.", "Has pedido demasiados enlaces"],
  ["404 accounts_off", 404, "accounts_off", "Cuentas apagadas.", "La entrada no está disponible ahora"],
] as const) {
  test.describe(nombre, () => {
    test.use({ manejadores: con(error(status, code, msg)) });
    test(`${nombre}: mensaje claro, el correo sigue escrito`, async ({ page }) => {
      await page.goto("/bienvenida/");
      await enviar(page);
      await errorEnCampo(page, esperado);
      await expect(page.getByLabel("Tu correo")).toHaveValue(CORREO);
    });
  });
}

test.describe("sin red al enviar", () => {
  test.use({ manejadores: { "GET /api/auth/session": sesionConCuentas } });
  test("dice que hace falta conexión y conserva el correo", async ({ page }) => {
    await page.goto("/bienvenida/");
    await page.route("**/api/auth/request", (r) => r.abort("internetdisconnected"));
    await enviar(page);
    await errorEnCampo(page, "Sin conexión");
    await expect(page.getByLabel("Tu correo")).toHaveValue(CORREO);
  });
});

test.describe("cuentas apagadas al cargar", () => {
  // La API simulada por defecto responde accounts:false.
  test("aviso «La entrada no está disponible ahora» y formulario desactivado", async ({ page }) => {
    await page.goto("/bienvenida/");
    await expect(page.getByText("La entrada no está disponible ahora.")).toBeVisible();
    await expect(page.getByLabel("Tu correo")).toBeDisabled();
    await expect(page.getByRole("button", { name: "Entrar con tu correo" })).toBeDisabled();
  });
});

test.describe("copia sin API", () => {
  test.use({ manejadores: { "GET /api/auth/session": () => ({ status: 404 }) } });
  test("la sesión responde 404 sin JSON → mismo aviso", async ({ page }) => {
    await page.route("**/api/auth/session", (r) => r.fulfill({ status: 404, contentType: "text/html", body: "<!doctype html><title>404</title>" }));
    await page.goto("/bienvenida/");
    await expect(page.getByText("La entrada no está disponible ahora.")).toBeVisible();
    await expect(page.getByLabel("Tu correo")).toBeDisabled();
  });
});

test.describe("reenviar falla", () => {
  let n = 0;
  test.use({
    manejadores: con(() => (++n % 2 ? { status: 200, body: { ok: true, minutes: 15 } } : { status: 502, body: { error: { code: "mail_failed", message: "x" } } })),
  });
  test.beforeEach(() => { n = 0; });
  test("vuelve el formulario con el error y el foco en el campo", async ({ page }) => {
    await page.goto("/bienvenida/");
    await enviar(page);
    await page.getByRole("button", { name: "Reenviar el enlace" }).click();
    await expect(page.locator("#entrada")).toBeVisible();
    await errorEnCampo(page, "No pudimos enviar el correo");
    await expect(page.getByLabel("Tu correo")).toBeFocused();
    await expect(page.getByLabel("Tu correo")).toHaveValue(CORREO);
  });
});

test.describe("dominios punycode", () => {
  let pedidas: unknown[] = [];
  test.use({ manejadores: con((r) => { pedidas.push(r.postDataJSON()); return { status: 200, body: { ok: true, minutes: 15 } }; }) });
  test.beforeEach(() => { pedidas = []; });
  test("un correo con dominio xn-- se envía", async ({ page }) => {
    await page.goto("/bienvenida/");
    await enviar(page, "ana@correo.xn--p1ai");
    await expect(page.getByRole("heading", { name: "Revisa tu correo" })).toBeVisible();
    expect(pedidas).toEqual([{ email: "ana@correo.xn--p1ai" }]);
  });
});
