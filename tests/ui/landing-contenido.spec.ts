import type { Page } from "@playwright/test";

import { test, expect, TEMAS } from "./fixtures.ts";
import { contrasteDeNodo } from "./util/contraste.ts";
import { recorridoTab } from "./util/foco.ts";
import { dianas44, sinScrollHorizontal } from "./util/layout.ts";

/**
 * Contenido y reglas de diseño de la landing (landing-y-acceso 3.4; AC-2, AC-23).
 */

test.use({ manejadores: { "GET /api/auth/session": () => ({ status: 200, body: { user: null, quota: null, accounts: true } }) } });

const TERRACOTA = "rgb(194, 112, 63)";

async function abrir(page: Page): Promise<void> {
  await page.goto("/bienvenida/");
  await expect(page.locator("h1")).toBeVisible();
}

/** Controles visibles cuyo fondo es el relleno principal. */
async function conRelleno(page: Page): Promise<string[]> {
  return page.locator("button, a, input[type=submit]").evaluateAll((ns, color) =>
    ns.filter((n) => {
      const r = n.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(n).backgroundColor === color;
    }).map((n) => (n.textContent ?? "").trim()), TERRACOTA);
}

for (const tema of TEMAS) {
  test.describe(`tema ${tema}`, () => {
    test.use({ colorScheme: tema });

    test("explica la ruta con texto real: rutas, 24 semanas, 45 minutos y qué se practica", async ({ page }) => {
      await abrir(page);
      const texto = await page.locator("main").innerText();
      for (const r of ["A2 → B1", "B1 → B2"]) expect(texto).toContain(r);
      expect(texto).toContain("24 semanas");
      expect(texto).toContain("45 minutos");
      for (const p of ["vocabulario", "gramática", "Use of English", "escucha", "lectura", "writing", "speaking"]) {
        expect(texto.toLowerCase()).toContain(p.toLowerCase());
      }
    });

    test("exactamente un control con el relleno terracota: «Entrar con tu correo», que lleva al campo", async ({ page }) => {
      await abrir(page);
      expect(await conRelleno(page)).toEqual(["Entrar con tu correo"]);
      await page.getByRole("button", { name: "Entrar con tu correo" }).click();
      await expect(page.getByLabel("Tu correo")).toBeFocused();
    });

    test("Instrument Sans en cuerpo, titular y botones", async ({ page }) => {
      await abrir(page);
      for (const sel of ["body", "h1", "button"]) {
        const familia = await page.locator(sel).first().evaluate((n) => getComputedStyle(n).fontFamily);
        expect(familia, sel).toMatch(/^"?Instrument Sans/);
      }
    });

    test("contraste AA del texto que se ve y de los botones", async ({ page }) => {
      await abrir(page);
      const nodos = [
        page.locator("h1"),
        page.locator(".l-hero .l-lede"),
        page.getByText("Tu correo", { exact: true }),
        page.locator("#lmailHint"),
        page.getByRole("button", { name: "Entrar con tu correo" }),
        page.locator(".l-sec-head .l-lede").first(),
        page.locator(".l-gains dd").first(),
        page.locator(".l-foot .l-small").first(),
      ];
      for (const n of nodos) {
        const m = await contrasteDeNodo(n);
        expect(m.ratio, `${await n.evaluate((e) => e.outerHTML.slice(0, 80))}: ${m.texto} sobre ${m.fondo}`).toBeGreaterThanOrEqual(4.5);
      }
    });

    test("foco visible al tabular sobre el botón principal y el campo", async ({ page }) => {
      await abrir(page);
      const campo = page.getByLabel("Tu correo");
      await campo.focus();
      await page.keyboard.press("Tab");
      const boton = page.getByRole("button", { name: "Entrar con tu correo" });
      await expect(boton).toBeFocused();
      for (const n of [boton, campo]) {
        await n.focus();
        const estilo = await n.evaluate((e) => {
          const s = getComputedStyle(e);
          return { estilo: s.outlineStyle, ancho: parseFloat(s.outlineWidth) };
        });
        expect(estilo.estilo).not.toBe("none");
        expect(estilo.ancho).toBeGreaterThanOrEqual(2);
      }
    });
  });
}

test("recorrido con teclado: el campo, el botón principal y cada actividad de la muestra", async ({ page }) => {
  await abrir(page);
  const paradas = await recorridoTab(page, 80);
  const todo = paradas.join("\n");
  expect(todo).toContain('input#lmail');
  expect(todo).toContain('"Entrar con tu correo"');
  for (const a of ["diagnóstico", "tarjetas", "escucha", "Use of English"]) {
    expect(todo.toLowerCase(), `parada de ${a}`).toContain(a.toLowerCase());
  }
});

test("sin scroll horizontal y dianas de 44 px en los controles", async ({ page }) => {
  await abrir(page);
  await sinScrollHorizontal(page);
  await dianas44(page, "main button, main input, .l-sec button");
});

test("sin progreso en el navegador no habla de él", async ({ page }) => {
  await abrir(page);
  await expect(page.getByText("Tu progreso sigue en este navegador")).toBeHidden();
});

test("con progreso en el navegador lo dice, y la landing no lo toca", async ({ page }) => {
  const progreso = JSON.stringify({ track: "b1b2", tracks: { b1b2: { days: { "1": true } } } });
  await page.addInitScript((p) => localStorage.setItem("ruta-b1b2-v1", p), progreso);
  await abrir(page);
  await expect(page.getByText("Tu progreso sigue en este navegador")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("ruta-b1b2-v1"))).toBe(progreso);
});
