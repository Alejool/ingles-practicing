# Rediseño limpio — Tareas

Fuente: `specs/rediseno-limpio/spec.md` y `plan.md`. Referencia visual: `docs/diseno/maqueta-rediseno.html`. Progreso de cada sesión en `specs/rediseno-limpio/progress.md` (lo crea la tarea 0.1).

Leyenda: `[ ]` pendiente · `[~]` en curso · `[x]` hecha · `[P]` paralelizable con las otras `[P]` de su fase (archivos disjuntos) · `[C]` punto de control · **[AUT]** necesita autorización explícita del dueño · **[DEC]** espera una decisión del dueño (plan, "Decisiones para el dueño").

Reglas:
- Test primero: cada "Test" se escribe, se ejecuta y se ve fallar antes de su "Implementar". Las tareas de **caracterización** son la excepción: fijan lo que ya hace la app y deben pasar en verde desde el principio.
- Unitarios con `node:test` en `tests/*.test.mts` (entran en `npm test`). Navegador con Playwright en `tests/ui/*.spec.ts` (`npm run test:ui`, contra `astro preview` del build).
- Comandos de punto de control (`.claude/CLAUDE.md`): `npm test`, `npm run test:plan`, `npm run check`, `npm run build`; desde la fase 1, también `npm run test:ui`.
- En cada `[C]`: suites y build en verde, `git diff --stat src/data` vacío, marcas de tareas revisadas, criterios del spec de la fase comprobados y resultado anotado en `progress.md`.
- `src/styles/global.css` es un solo archivo: ninguna tarea que lo edite es `[P]`.
- Orden con otras features: `specs/ORDEN.md` y la tabla "Dependencias y orden" del plan. Tras BES 6.2 las rutas `src/…` pasan a `frontend/src/…`.

## Fase 0 — Requisitos previos

- [ ] 0.1 Línea base: `npm test`, `npm run test:plan`, `npm run check`, `npm run build` en verde; anotar números (tests, avisos de `check`, tamaño del esqueleto que imprime `precache`) en `progress.md`.
  - Archivos: `specs/rediseno-limpio/progress.md`.
- [ ] 0.2 **[DEC]** Aprobación de la maqueta (`docs/diseno/maqueta-rediseno.html` + `docs/diseno/capturas/`, terracota #C2703F) y respuesta a las dos preguntas abiertas del spec (uso del terracota; Mi seguimiento en "Atajos"). Sin ella no empieza la fase 2.
- [ ] 0.3 **[AUT]** OK del dueño a la dependencia `@playwright/test` (versión exacta) con navegador Edge local (plan R-1, R-2). Sin él no empieza la fase 1.
- [ ] 0.4 Dependencia: `selector-de-ruta` cerrado (toca `dom.ts`, `Base.astro`, `global.css`, `dialogo.ts`). Sin él no empieza la fase 2; la fase 1 sí.
- [ ] 0.5 [C] Punto de control: línea base, decisiones y dependencias anotadas en `progress.md`.

## Fase 1 — Suite de interfaz (la que comparten todas las features)

- [ ] 1.1 Instalar `@playwright/test` con versión exacta (≥ 2 semanas publicada) en `devDependencies`; script `"test:ui": "playwright test"`; `playwright.config.ts` con `webServer` (`npm run build:fast` + `astro preview --port 4329`), `channel: "msedge"` en local, proyectos escritorio 1440×900, móvil 375×812 (`isMobile`, `hasTouch`) y móvil 320×640; `testDir: tests/ui`. Anotar versión y motivo en `progress.md`.
  - Archivos: `package.json`, `package-lock.json`, `playwright.config.ts`.
- [ ] 1.2 Test (falla primero): `tests/contraste.test.mts` — `ratio("#000000", "#C2703F")` = 5,68 ± 0,01; `ratio("#FFFFFF","#FFFFFF")` = 1; acepta `rgb()`/`rgba()` opacos y rechaza los translúcidos con error explícito.
  - Archivos: `tests/contraste.test.mts`.
- [ ] 1.3 Implementar `tests/ui/util/contraste.ts` (luminancia WCAG 2.x pura, exportable a `node:test`) + `contrasteDeNodo(page, locator)` que resuelve el fondo opaco efectivo.
  - Archivos: `tests/ui/util/contraste.ts`.
- [ ] 1.4 [P] Implementar utilidades de página con su propio spec de prueba (`tests/ui/util.spec.ts` sobre una página `data:` mínima: una con desbordamiento y otra sin él; un botón de 40 px y otro de 44 px; un `h1[tabindex=-1]`): `sinScrollHorizontal`, `dianas44`, `focoEnH1`, `recorridoTab`.
  - Archivos: `tests/ui/util/layout.ts`, `tests/ui/util/foco.ts`, `tests/ui/util.spec.ts`.
- [ ] 1.5 [P] `tests/ui/fake-api.ts` (rutas `/api/**`: sesión con cuentas apagadas, cuota, progreso 404, todo lo demás 404 con registro) y `tests/ui/fixtures.ts` (test extendido: tema claro/oscuro por `colorScheme`, carga opcional de `tests/fixtures/progreso-local-real.json` en `localStorage` antes de navegar, fallo si hay errores de consola o peticiones no simuladas).
  - Archivos: `tests/ui/fake-api.ts`, `tests/ui/fixtures.ts`.
- [ ] 1.6 Fixture real: reutilizar `tests/fixtures/progreso-local-real.json` si `ruta-b2-c1` o `landing-y-acceso` ya lo dejaron; si no, pedir al dueño un "Exportar copia" real y anonimizarlo (mismas reglas que `landing-y-acceso` 0.5).
  - Archivos: `tests/fixtures/progreso-local-real.json`.
- [ ] 1.7 Caracterización (verde desde el principio): `tests/ui/caracterizacion.spec.ts` — en la app **actual**, con y sin el progreso real, abrir cada una de las 18 vistas por su ítem del menú: existe su `h1`, no hay errores de consola, y las cifras del Panel (días hechos, tarjetas para hoy, dominio por destreza) coinciden con las del fixture. Esta prueba no se edita durante el rediseño salvo para cambiar selectores, y cada cambio de selector se anota.
  - Archivos: `tests/ui/caracterizacion.spec.ts`.
- [ ] 1.8 Caracterización de datos: `tests/ui/datos.spec.ts` — con el fixture cargado, recorrer las 18 vistas y comparar `localStorage` antes/después (claves y valores; solo `theme` puede cambiar si se pulsa el tema). (AC-22)
  - Archivos: `tests/ui/datos.spec.ts`.
- [ ] 1.9 Documentar la suite para otras features: comando, carpeta, cómo se sirve el build, utilidades y cómo ampliar `fake-api.ts` (sección "Suite de interfaz" en `progress.md`; `landing-y-acceso` 0.2 la lee).
  - Archivos: `specs/rediseno-limpio/progress.md`.
- [ ] 1.10 [C] Punto de control: `npm test`, `npm run test:plan`, `npm run check`, `npm run build`, `npm run test:ui` en verde (la app aún no ha cambiado); avisar a `landing-y-acceso` de que su 0.2 está desbloqueada.

## Fase 2 — Fichas, fuente y reglas globales

- [ ] 2.1 Test (falla primero): `tests/fichas.test.mts` — lee los bloques de fichas de `src/styles/global.css` (`:root`, oscuro por `prefers-color-scheme` y `[data-theme="dark"]`) y comprueba: los valores de la tabla "Color (papeles)" del spec, `--fill` = #C2703F y `--fill-hover` = #B3652F en los dos temas, `--on-fill` = #000000; cada pareja de la tabla de contraste del spec ≥ su mínimo; los tres bloques oscuros son idénticos entre sí. (AC-7, AC-8)
  - Archivos: `tests/fichas.test.mts`.
- [ ] 2.2 Implementar las fichas nuevas en `global.css`: cambiar `--fill` de #FE7F2D a **#C2703F** y `--fill-2` (#E96C17) por `--fill-hover` **#B3652F** (con alias `--fill-2: var(--fill-hover)` hasta 7.3), más el resto de fichas de la maqueta (`--bg-muted`, `--bg-hover`, `--bg-active`, `--ink-2/3`, `--nav-active-ink`, `--border-control`, `--ok/warn/bad` y sus suaves, `--focus`, `--scrim`, `--shadow-dialog`, escala tipográfica, espaciado, radios y movimiento).
  - Archivos: `src/styles/global.css`.
- [ ] 2.3 Test (falla primero): en `tests/fichas.test.mts` — ningún hex/`rgb(` fuera de los bloques de fichas en `global.css`, `src/components/**`, `src/layouts/**` y `src/scripts/**` (principio 10); ninguna referencia a `Newsreader`, `Azeret`, `--f-display`, `--f-mono` ni `fonts.googleapis`/`fonts.gstatic`; cero `alert(` en `src/scripts`. (AC-4, AC-12)
  - Archivos: `tests/fichas.test.mts`.
- [ ] 2.4 Test (falla primero): `tests/ui/fuente.spec.ts` — con la red a terceros bloqueada, `document.fonts.check('600 16px "Instrument Sans"')` es verdadero tras cargar; el `font-family` calculado de `body`, `h1` y botones empieza por "Instrument Sans"; `font-stretch` de `h1` = 87,5 %. (AC-4)
  - Archivos: `tests/ui/fuente.spec.ts`.
- [ ] 2.5 **[AUT]** Implementar la fuente alojada: descargar una vez `instrument-sans-latin-wdth-normal.woff2` de `@fontsource-variable/instrument-sans@5.3.0` (jsDelivr) y su `LICENSE` (OFL 1.1) a `public/fonts/`; `@font-face` con `font-weight:400 700` y `font-stretch:75% 100%` en `global.css`; `<link rel="preload" as="font" crossorigin>` en `Base.astro`; quitar los `<link>` de Google Fonts.
  - Archivos: `public/fonts/instrument-sans-latin-wdth-normal.woff2`, `public/fonts/OFL.txt`, `src/styles/global.css`, `src/layouts/Base.astro`.
- [ ] 2.6 Test (falla primero) + implementar: el woff2 entra en el esqueleto del precache (test de clasificación de `scripts/precache-lib.mts` si existe; si no, sobre la lista de salida de `precache.mts`).
  - Archivos: `scripts/precache.mts` (o `scripts/precache-lib.mts`), `tests/precache.test.mts`.
- [ ] 2.7 Sustituir los 57 usos de `--f-display`/`--f-mono` por la escala de Instrument Sans (`--t-*`, `font-stretch:87.5%` en titulares y cifras, `tabular-nums` en cifras). Solo CSS y clases; 2.3 pasa a verde.
  - Archivos: `src/styles/global.css`, `src/components/**/*.astro` donde haya `style` con esas variables.
- [ ] 2.8 Test (falla primero) + implementar movimiento reducido global: `tests/ui/componentes.spec.ts` (bloque "movimiento") con `reducedMotion: "reduce"` → `transition-duration` y `animation-duration` 0 en botón, cajón y diálogo; spinner sin rotación. (AC-20)
  - Archivos: `tests/ui/componentes.spec.ts`, `src/styles/global.css`.
- [ ] 2.9 [C] Punto de control: suites + build; `caracterizacion.spec` y `datos.spec` en verde; capturas de Panel claro/oscuro a mano contra `docs/diseno/capturas/desk-*-panel.png` (solo color y fuente: el shell aún no cambió); anotar.

## Fase 3 — Shell (lateral, barra superior, cajón)

- [ ] 3.1 Test (falla primero): `tests/ui/shell.spec.ts` (escritorio) — lateral con selector de ruta arriba, grupo "Estudiar" (12 ítems), grupo "Atajos" (Diagnóstico, Qué examen, Cuaderno de errores, Recursos; y Mi seguimiento cuando exista su vista), pie con Ajustes, Cuenta y tema; iconos `<svg><use>` del sprite y ningún emoji; ítem actual con `aria-current="page"` y borde; al cambiar de vista el foco va al `h1` (sin anillo con ratón); el nombre accesible de cada ítem contiene su texto visible; ninguna opción de clave propia. (AC-6, AC-9, AC-17, AC-19)
  - Archivos: `tests/ui/shell.spec.ts`.
- [ ] 3.2 Implementar el lateral: sprite de iconos en `Base.astro`; `Rail.astro` con grupos y pie; `nav.ts` pinta grupos y `aria-current`, mueve el foco al `h1`; "Reiniciar" sale del lateral y pasa a Ajustes con la misma función.
  - Archivos: `src/layouts/Base.astro`, `src/components/Rail.astro`, `src/scripts/nav.ts`, `src/components/views/Settings.astro`, `src/styles/global.css`.
- [ ] 3.3 Test (falla primero): `tests/ui/shell.spec.ts` (móvil 375) — por debajo de 960 px, barra superior de una línea (menú, nombre de la vista, chip de ruta) sin franja propia de ruta; abrir el cajón pone `inert` en contenido y barra, el foco entra en el ítem actual; Escape y tocar el velo cierran y devuelven el foco al botón de menú; pasar a 1280 px con el cajón abierto lo cierra y quita `inert`. (AC-14, AC-15)
  - Archivos: `tests/ui/shell.spec.ts`.
- [ ] 3.4 Implementar barra superior, velo y cajón (`--ease-drawer`, 200 ms) en `Rail.astro`/`nav.ts`.
  - Archivos: `src/components/Rail.astro`, `src/scripts/nav.ts`, `src/styles/global.css`.
- [ ] 3.5 Test (falla primero) + implementar la piel del diálogo de ruta (`dialogo.ts` de SEL sin cambiar su comportamiento): sombra solo aquí (`--shadow-dialog`), entrada desde escala 0,97, opciones con `checked` + borde, botón principal desactivado hasta elegir otra ruta. (AC-5, AC-9)
  - Archivos: `tests/ui/shell.spec.ts`, `src/styles/global.css`.
- [ ] 3.6 [C] Punto de control: suites + build; `caracterizacion.spec` (solo selectores del menú actualizados y anotados) y `datos.spec` en verde; `design:design-critique` y `design:accessibility-review` sobre el shell; anotar.

## Fase 4 — Componentes

- [ ] 4.1 Test (falla primero): `tests/ui/componentes.spec.ts` — sobre vistas reales (Panel: principal, secundario, tiles, filas; Plan: pasos, barra; Ajustes/Cuenta: campos; Vocabulario: filtros y filas): botón principal con fondo `--fill` y texto negro, hover con ratón (`--fill-hover`), foco con Tab (anillo 2 px `--focus`), `:active` escala 0,97, desactivado, cargando (`aria-busy` + spinner + texto); secundario y discreto con los suyos; campo con hover/foco/desactivado y error (`aria-invalid`, `aria-describedby`, icono); sin `box-shadow` salvo el diálogo; fila-tarjeta con hover solo en puntero fino. (AC-2, AC-3, AC-5, AC-10, AC-11)
  - Archivos: `tests/ui/componentes.spec.ts`.
- [ ] 4.2 Implementar botones (principal, secundario, discreto, pequeño) en `global.css`, con alias de clases viejas (`.btn.ghost`, `.btn.small`) hasta 7.3.
  - Archivos: `src/styles/global.css`.
- [ ] 4.3 Implementar campo, chip, insignia, tile, barra (relleno `--accent`, no `--fill`), fila-tarjeta, paso del plan, tarjeta, banner de error, estado vacío, esqueleto.
  - Archivos: `src/styles/global.css`.
- [ ] 4.4 Test (falla primero) + implementar: `mark`/`.hl` y `.progline i.c` dejan de usar `--fill` (petróleo). Si el dueño decidió en 0.2 terracota para barras y día actual, este test se invierte para esos dos selectores y se anotan las parejas medidas del spec. (AC-3)
  - Archivos: `tests/ui/componentes.spec.ts`, `src/styles/global.css`.
- [ ] 4.5 [C] Punto de control: suites + build; comparar la hoja de estados de la maqueta con la app (claro y oscuro); `design:design-critique`; anotar.

## Fase 5 — Vistas maquetadas (Panel, Plan diario, Vocabulario)

- [ ] 5.1 [P] Test (falla primero): `tests/ui/vistas-panel.spec.ts` — miga, `h1.display`, entradilla; 4 tiles sobre gris; tarjeta "La sesión de hoy" con bloques; exactamente un botón con `--fill` ("Empezar el día N"); "Qué toca ahora" con filas y acción visible en táctil; dominio por destreza con barra roja < 70 %; contraste de cada texto visible ≥ 4,5 y bordes de control ≥ 3, claro y oscuro. (AC-1, AC-2, AC-7, AC-8, AC-11)
  - Archivos: `tests/ui/vistas-panel.spec.ts`.
- [ ] 5.2 [P] Test (falla primero): `tests/ui/vistas-plan.spec.ts` — pasos hecho/actual/pendiente (actual con `aria-current="step"` y borde), una sola acción principal, navegación "Día N, anterior/siguiente" con nombre que contiene el texto visible, barra de pasos con `role=progressbar`. (AC-1, AC-2, AC-9, AC-19)
  - Archivos: `tests/ui/vistas-plan.spec.ts`.
- [ ] 5.3 [P] Test (falla primero): `tests/ui/vistas-vocab.spec.ts` — filtros con `aria-pressed` que conservan el foco al pulsarse; elegir mazo marca la fila con `aria-current` y el foco queda en su botón; una sola acción principal. (AC-9, AC-18)
  - Archivos: `tests/ui/vistas-vocab.spec.ts`.
- [ ] 5.4 Implementar Panel (markup y clases según la maqueta; sin tocar cálculos de `panel.ts`/`progress.ts`).
  - Archivos: `src/components/views/Panel.astro`, `src/scripts/views/panel.ts`, `src/styles/global.css`.
- [ ] 5.5 Implementar Plan diario.
  - Archivos: `src/components/views/Plan.astro`, `src/scripts/views/plan.ts`, `src/styles/global.css`.
- [ ] 5.6 Implementar Vocabulario.
  - Archivos: `src/components/views/Vocab.astro`, `src/scripts/views/vocab.ts`, `src/styles/global.css`.
- [ ] 5.7 [C] Punto de control: suites + build; capturas de la app contra `docs/diseno/capturas/{desk,mob}-{light,dark}-{panel,plan,vocab}.png`; `design:design-critique`, `design:accessibility-review`, `break-ui` (nombres largos, 0 tarjetas, 999 pendientes); anotar.

## Fase 6 — Resto de vistas (mismo esqueleto)

- [ ] 6.1 [P] Test (falla primero): `tests/ui/vistas-estudiar.spec.ts` — Mis palabras, Gramática, Use of English, Listening & Reading, Writing, Speaking, Tutor, Prueba rápida, Simulacro: esqueleto de AC-1, como mucho una acción principal, contraste, estado vacío con acción donde hay listas, esqueleto `aria-busy` al cargar contenido de ruta, banner con reintento si falla la descarga (API simulada caída). (AC-1, AC-2, AC-7, AC-10)
  - Archivos: `tests/ui/vistas-estudiar.spec.ts`.
- [ ] 6.2 [P] Test (falla primero): `tests/ui/vistas-atajos.spec.ts` — Diagnóstico, Qué examen, Cuaderno de errores, Recursos, Ajustes, Cuenta: mismo esqueleto y estados; Ajustes y Cuenta solo accesibles desde el pie; ningún texto ni campo de "clave propia"/"API key". (AC-1, AC-2, AC-10)
  - Archivos: `tests/ui/vistas-atajos.spec.ts`.
- [ ] 6.3 Implementar Mis palabras, Gramática, Use of English (en ese orden; después de las tareas abiertas de SEL/TUT/C1 sobre sus `.ts`, ver `ORDEN.md`).
  - Archivos: `src/components/views/{Mine,Grammar,Uoe}.astro`, `src/scripts/views/{mine,grammar,uoe}.ts`, `src/styles/global.css`.
- [ ] 6.4 Implementar Listening & Reading, Writing, Speaking, Tutor.
  - Archivos: `src/components/views/{Reading,Writing,Speaking,Tutor}.astro`, `src/scripts/views/{reading,listening,dictation,writing,speaking,tutor}.ts`, `src/styles/global.css`.
- [ ] 6.5 Implementar Prueba rápida y Simulacro.
  - Archivos: `src/components/views/{Quiz,Mock}.astro`, `src/scripts/views/{quiz,mock}.ts`, `src/styles/global.css`.
- [ ] 6.6 Implementar Diagnóstico, Qué examen, Cuaderno de errores, Recursos y el onboarding.
  - Archivos: `src/components/views/{Diagnostic,Exams,Errors,Resources}.astro`, `src/scripts/views/{diagnostic,exams,errors,resources,onboarding}.ts`, `src/styles/global.css`.
- [ ] 6.7 Implementar Ajustes y Cuenta (incluye "Reiniciar" de 3.2 en Ajustes, con su confirmación en texto, sin `alert`).
  - Archivos: `src/components/views/{Settings,Account}.astro`, `src/scripts/views/{settings,account}.ts`, `src/styles/global.css`.
- [ ] 6.8 Piel de Mi seguimiento y de la landing para `landing-y-acceso`: clases de la maqueta (`.skill`, `.spark`, `.facts`, `.prop`, `.decided`, `.l-*`, `.try`, `.ans`, `.fb`, `.gain`, `.sent`, `.banner.warn`) en `global.css`, con un test de presencia de reglas en `tests/fichas.test.mts`. No crea vistas (non-goal). (plan R-10)
  - Archivos: `src/styles/global.css`, `tests/fichas.test.mts`.
- [ ] 6.9 [C] Punto de control: suites + build; `caracterizacion.spec` y `datos.spec` en verde; `design:design-critique` y `design:accessibility-review` sobre Simulacro y Writing (las de más estados); anotar.

## Fase 7 — Móvil, accesibilidad global y limpieza

- [ ] 7.1 Test (falla primero) + corregir: `tests/ui/movil.spec.ts` — las 18 vistas, el cajón abierto y el diálogo, a 375 y 320 px, claro y oscuro: `scrollWidth === clientWidth`; dianas ≥ 44×44; campos con 16 px; acciones de fila visibles en táctil. (AC-11, AC-13, AC-16)
  - Archivos: `tests/ui/movil.spec.ts`, `src/styles/global.css`.
- [ ] 7.2 Test (falla primero) + corregir: recorrido completo con teclado (`recorridoTab`) de shell + Panel + Vocabulario + diálogo sin perder el foco ni caer en el contenido con el cajón abierto; foco visible en cada parada. (AC-15, AC-17, AC-18)
  - Archivos: `tests/ui/shell.spec.ts`, `src/scripts/nav.ts`, `src/styles/global.css`.
- [ ] 7.3 Test (falla primero) + limpiar: `tests/fichas.test.mts` exige que no queden el alias `--fill-2` ni las clases viejas de 4.2 ni reglas de `global.css` sin selector vivo en `src/` (lista generada); quitar lo sobrante.
  - Archivos: `tests/fichas.test.mts`, `src/styles/global.css`.
- [ ] 7.4 [C] Punto de control: suites + build; `design:accessibility-review` y `break-ui` sobre el conjunto; anotar.

## Fase 8 — Cierre

- [ ] 8.1 Rehacer capturas de la app real (no de la maqueta) en `docs/diseno/capturas/app/` con los mismos nombres `{desk,mob}-{light,dark}-{vista}.png`, desde un spec de Playwright (`tests/ui/capturas.spec.ts`, solo con `CAPTURAS=1`).
  - Archivos: `tests/ui/capturas.spec.ts`, `docs/diseno/capturas/app/*.png`.
- [ ] 8.2 Revisión de supervisores: `/code-review` y `/simplify` sobre el diff; `design:design-critique`, `design:accessibility-review`. Hallazgos altos vuelven a su tarea.
- [ ] 8.3 Marcar los AC del spec cumplidos y anotar en `progress.md` cómo se comprobó cada uno.
  - Archivos: `specs/rediseno-limpio/spec.md`, `specs/rediseno-limpio/progress.md`.
- [ ] 8.4 [C] **Build Verification** (final): `npm run build` (incluye `astro check` y precache), `npm test`, `npm run test:plan`, `npm run check`, `npm run test:ui` — todo en verde; `git diff --stat src/data` vacío; `localStorage` del fixture idéntico (`datos.spec`); `master` intacto. Anotar números frente a la línea base de 0.1.

## Resumen

| Fase | Tareas | `[C]` |
|---|---|---|
| 0 Requisitos | 5 | 1 |
| 1 Suite de interfaz | 10 | 1 |
| 2 Fichas y fuente | 9 | 1 |
| 3 Shell | 6 | 1 |
| 4 Componentes | 5 | 1 |
| 5 Vistas maquetadas | 7 | 1 |
| 6 Resto de vistas | 9 | 1 |
| 7 Móvil y accesibilidad | 4 | 1 |
| 8 Cierre | 4 | 1 |
| **Total** | **59** | **9** |

## Dependencias externas

| Tarea | Necesita | De |
|---|---|---|
| 1.x | OK a `@playwright/test` | dueño (0.3) |
| 2.x en adelante | Maqueta aprobada | dueño (0.2) |
| 2.x en adelante | SEL cerrado | `selector-de-ruta` (0.4) |
| 2.5 | OK a descargar el woff2 | dueño |
| 6.3–6.6 | Tareas abiertas de SEL/TUT/C1 sobre esas vistas terminadas | `ORDEN.md` |

| Otra feature | Necesita de aquí |
|---|---|
| `landing-y-acceso` 0.2 (fases 3–8) | 1.10 (suite lista y documentada) |
| `landing-y-acceso` 0.4 / 3.5 | 0.2 (maqueta aprobada) |
| `landing-y-acceso` en `global.css`, `Base.astro`, `index.astro` | Fases 2 y 3 terminadas; clases de 6.8 |
