import { expect, test } from "@playwright/test";

import { contrasteDeNodo } from "./util/contraste.ts";
import { focoEnH1, recorridoTab } from "./util/foco.ts";
import { dianas44, sinScrollHorizontal } from "./util/layout.ts";

const BASE = "<!doctype html><meta name=viewport content='width=device-width'><style>body{margin:0}</style>";

test.describe("sinScrollHorizontal", () => {
  test("pasa en una página que cabe", async ({ page }) => {
    await page.setContent(`${BASE}<p>Cabe.</p>`);
    await sinScrollHorizontal(page);
  });

  test("falla en una página que desborda", async ({ page }) => {
    await page.setContent(`${BASE}<div style="width:3000px">Ancho</div>`);
    await expect(sinScrollHorizontal(page)).rejects.toThrow(/scroll horizontal/);
  });
});

test.describe("dianas44", () => {
  const botones = `${BASE}
    <button id="b44" style="width:44px;height:44px;padding:0">A</button>
    <button id="b40" style="width:40px;height:40px;padding:0">B</button>
    <button id="oculto" style="display:none">C</button>`;

  test("pasa con un botón de 44 px", async ({ page }) => {
    await page.setContent(botones);
    await dianas44(page, "#b44");
  });

  test("ignora lo que no se ve", async ({ page }) => {
    await page.setContent(botones);
    await dianas44(page, "#oculto");
  });

  test("falla con un botón de 40 px y lo nombra", async ({ page }) => {
    await page.setContent(botones);
    await expect(dianas44(page, "button")).rejects.toThrow(/40×40/);
  });
});

test.describe("focoEnH1", () => {
  test("pasa con el foco en un h1[tabindex=-1]", async ({ page }) => {
    await page.setContent(`${BASE}<h1 tabindex="-1">Panel</h1><button>Ir</button>`);
    await page.locator("h1").focus();
    await focoEnH1(page);
  });

  test("falla si el foco está en otro sitio", async ({ page }) => {
    await page.setContent(`${BASE}<h1 tabindex="-1">Panel</h1><button>Ir</button>`);
    await page.locator("button").focus();
    await expect(focoEnH1(page)).rejects.toThrow(/no en el h1/);
  });
});

test.describe("recorridoTab", () => {
  test("recorre los controles en orden y salta el h1 de tabindex -1", async ({ page, isMobile }) => {
    test.skip(isMobile, "Tab no tiene sentido en los proyectos táctiles");
    await page.setContent(`${BASE}<h1 tabindex="-1">Panel</h1><button id="a">Uno</button><a href="#x">Dos</a><input aria-label="Tres">`);
    expect(await recorridoTab(page)).toEqual(['button#a "Uno"', 'a "Dos"', 'input "Tres"']);
  });
});

test.describe("contrasteDeNodo", () => {
  test("mide el texto contra el primer fondo opaco de sus antecesores", async ({ page }) => {
    await page.setContent(`${BASE}<div style="background:#C2703F"><p><span id="t" style="color:#000">Empezar</span></p></div>`);
    const medida = await contrasteDeNodo(page.locator("#t"));
    expect(medida.fondo).toBe("rgb(194, 112, 63)");
    expect(medida.ratio).toBeCloseTo(5.68, 2);
  });

  test("falla si el fondo efectivo es translúcido", async ({ page }) => {
    await page.setContent(`${BASE}<div style="background:rgba(0,0,0,.5)"><span id="t" style="color:#fff">Velo</span></div>`);
    await expect(contrasteDeNodo(page.locator("#t"))).rejects.toThrow(/translúcido/);
  });
});
