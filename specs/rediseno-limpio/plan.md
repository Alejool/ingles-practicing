# Rediseño limpio — Plan técnico

Fuente funcional: `specs/rediseno-limpio/spec.md` (AC-1 a AC-24). Referencia visual: `docs/diseno/maqueta-rediseno.html` y `docs/diseno/capturas/` (Panel, Plan diario, Vocabulario, Mi seguimiento, landing, hoja de estados; escritorio 1440 px y móvil 375 px, claro y oscuro). Constitución: principios 1 (test primero), 6 (lo guardado no cambia), 7 (contenido intacto), 9 (accesible por construcción) y 10 (colores solo de fichas).

Decisiones del dueño que fija este plan (`.agentflow/DECISIONS.md`, 2026-11-05 "Hazlo todo eso", punto 5, y mensaje del 2026-11-06):
- El rediseño se aplica a **todas** las vistas.
- Ajustes y Cuenta van en el **pie del lateral**.
- El acento es **terracota #C2703F** (hover y pulsado #B3652F), igual en claro y oscuro, con texto negro.
- **Instrument Sans alojada en la app** (sin Google Fonts).
- **Sin clave propia de DeepSeek** en ninguna vista (la quita `landing-y-acceso` fase 6; aquí no se maqueta).
- **Antes de aplicar el rediseño existe una suite de tests de interfaz.**

## Hechos del código (leídos el 2026-11-06)

| Hecho | Dónde | Consecuencia |
|---|---|---|
| Fichas de color en un solo bloque `:root` + oscuro; `--fill:#FE7F2D`, `--fill-2:#E96C17` | `src/styles/global.css:1-50` | El cambio de color es local al bloque de fichas. `--fill-2` pasa a llamarse `--fill-hover` como en la maqueta, con alias temporal hasta que no quede uso. |
| `--fill` se usa hoy también como relleno de barras (`.bar > i`, `.progline i.c`) y en `mark/.hl` | `global.css:91,154,219` | AC-3 lo prohíbe: barras y marca pasan a petróleo (`--accent`). Ver decisión abierta 2 del spec. |
| Tres familias: Newsreader (serif), Instrument Sans y Azeret Mono, desde Google Fonts | `src/layouts/Base.astro:34-38`, `global.css:21-23` | AC-4: queda solo Instrument Sans, servida desde `public/fonts/`. 57 usos de `--f-display`/`--f-mono` a sustituir. |
| Lateral en `Rail.astro` (14 líneas: marca, selector, nav, tema y "Reiniciar") y el menú lo pinta `nav.ts` | `src/components/Rail.astro`, `src/scripts/nav.ts` | El shell nuevo (grupos Estudiar/Atajos, pie con Ajustes, Cuenta y tema) se monta ahí. "Reiniciar" se mueve a Ajustes (misma función, sin cambiar lo que borra). |
| 18 vistas = 18 `.astro` en `src/components/views/` + su `.ts` en `src/scripts/views/` | árbol de `src/` | Cada vista es un par de archivos disjunto: los tests de vista se pueden escribir en paralelo. El CSS sigue en `global.css` (archivo único: se aplica en serie). |
| Cero `alert(` en `src/scripts` | `grep` | AC-12 se fija con un test de guarda, no hay nada que migrar. |
| No hay suite de interfaz; `npm test` = `node:test` sobre `tests/*.test.mts` | `package.json` | Fase 1 la monta. `tests/ui/*.spec.ts` no casa con el glob de `npm test`: las dos suites no se pisan. |
| Microsoft Edge instalado en la máquina de desarrollo | `C:/Program Files (x86)/Microsoft/Edge/` | Playwright puede usar `channel: "msedge"` sin descargar navegadores. |

## Technical Approach

1. **Suite de interfaz primero (fase 1).** Playwright Test, versión exacta fijada, contra el build servido con `astro preview`. Es **la** suite de interfaz del proyecto: `specs/landing-y-acceso/` (desde su fase 3) y las demás features añaden sus `*.spec.ts` en `tests/ui/` y usan sus utilidades; no montan otra. Antes de tocar estilos se escribe un recorrido de **caracterización** de la app actual (las 18 vistas cargan, sin errores de consola, el progreso guardado no cambia) que debe seguir en verde durante todo el rediseño.
2. **Fichas como datos comprobables.** La tabla de contraste del spec se convierte en un test `node:test` que lee los bloques de fichas de `global.css` y mide cada pareja con la fórmula WCAG. Otro test prohíbe hex/rgb fuera de esos bloques (principio 10) y las familias retiradas.
3. **Fuente alojada.** `instrument-sans-latin-wdth-normal.woff2` de `@fontsource-variable/instrument-sans@5.3.0` (OFL 1.1, ejes wght 400–700 y wdth 75–100) copiado una vez a `public/fonts/` con su licencia, `@font-face` en `global.css`, `preload` en `Base.astro` y entrada en el precache del service worker. No se añade el paquete como dependencia: es un archivo estático.
4. **Shell, componentes y vistas en ese orden**, cada paso con su spec de Playwright escrito antes. Los componentes se prueban dentro de las vistas reales donde aparecen (no hay página de galería en producción).
5. **Sin cambios funcionales verificados**: la caracterización de la fase 1, `npm test`, `npm run test:plan`, y un test de almacenamiento que compara `localStorage` antes y después de recorrer todas las vistas con un progreso real cargado.

## Decisiones

| # | Decisión | Alternativa descartada | Motivo |
|---|---|---|---|
| R-1 | Playwright Test (`@playwright/test`, versión exacta, devDependency) | Seguir sin suite; Cypress; un script CDP propio | Es la única dependencia nueva. Da contexto limpio por test, emulación de 375/320 px, `prefers-color-scheme`, `prefers-reduced-motion`, teclado real y `page.route` para simular la API. Cypress no maneja varias pestañas (landing AC-6b las necesita). Un script CDP propio (el que se usó para las capturas de la maqueta) no tiene aserciones ni informes. |
| R-2 | Navegador local `channel: "msedge"`; en CI, `npx playwright install chromium` | Descargar navegadores siempre | Sin descarga en la máquina del dueño. La versión del Chromium de CI queda fijada por la de Playwright. |
| R-3 | La suite corre contra `astro preview` del build | Contra `astro dev` | El build es lo que se publica y lo que precachea el service worker; `dev` no tiene SW ni el bundle final. |
| R-4 | API simulada con `page.route` en `tests/ui/fake-api.ts` | Levantar la API real | Determinista, sin coste y sin Docker. El smoke real lo hace `bash start.sh test` cuando lo pide el dueño. `landing-y-acceso` amplía este mismo archivo. |
| R-5 | Contraste medido en dos niveles: fichas (`tests/fichas.test.mts`, `node:test`) y en página (`tests/ui/util/contraste.ts`, colores calculados de los nodos visibles) | Solo revisión manual | AC-7/AC-8 dicen "medido, no estimado". El primero falla rápido; el segundo cubre combinaciones reales. |
| R-6 | Sin `axe-core` | `@axe-core/playwright` | Segunda dependencia; los criterios de este spec (foco, nombres, `aria-current`, `inert`, dianas, scroll) se comprueban con utilidades propias pequeñas. La revisión `design:accessibility-review` cubre el resto en los puntos de control. Revisable si el dueño lo prefiere. |
| R-7 | Barras y "día actual" en petróleo; terracota solo en el botón principal | Terracota también en barras y día actual (como la app hoy) | Lo pide AC-3. Queda como decisión abierta del dueño (spec, Open Questions 2): si se cambia, solo cambian las reglas de `.bar > i` y `.step[data-state=current]` y se añaden las parejas ya medidas. |
| R-8 | `--fill-2` se renombra a `--fill-hover` con alias `--fill-2: var(--fill-hover)` hasta la última vista | Renombrar todo de golpe | Permite migrar vista a vista sin romper las que faltan; la tarea de cierre quita el alias con un test que lo exige. |
| R-9 | Iconos de línea como `<symbol>` en un sprite en `Base.astro` | Librería de iconos | Son ~30 iconos ya dibujados en la maqueta; sin dependencia. |
| R-10 | Mi seguimiento y landing: aquí solo su piel (CSS y estructura de la maqueta); el comportamiento lo implementa `landing-y-acceso` | Implementarlos aquí | Non-goal "añadir vistas"; esas vistas son de otra feature. Este plan deja listas las clases (`.skill`, `.spark`, `.facts`, `.l-*`, `.ans`, `.try`) para que las use. |

## Arquitectura

### Archivos

```
package.json                     + devDependency @playwright/test (exacta) + script "test:ui"
playwright.config.ts             webServer: npm run build:fast && astro preview --port 4329; projects: escritorio 1440, móvil 375 (mobile:true), móvil 320; claro y oscuro por test
tests/ui/util/contraste.ts       luminancia WCAG; contraste de un nodo contra su fondo efectivo; parejas de borde de control
tests/ui/util/layout.ts          sinScrollHorizontal(page), dianas44(page, selector)
tests/ui/util/foco.ts            foco en h1 tras navegar, recorrido Tab, trampa del cajón
tests/ui/fake-api.ts             rutas /api/** simuladas (sesión sin cuentas, cuota, progreso 404) ampliables por otras features
tests/ui/fixtures.ts             test extendido: tema, progreso real cargado en localStorage, registro de errores de consola
tests/ui/caracterizacion.spec.ts recorrido de las 18 vistas en la app actual
tests/ui/shell.spec.ts, componentes.spec.ts, vistas-*.spec.ts, movil.spec.ts, datos.spec.ts
tests/fichas.test.mts            tabla de contraste del spec, sin hex fuera de fichas, familias retiradas (entra en npm test)
tests/fixtures/progreso-local-real.json   compartido con landing-y-acceso (0.5 de su tasks.md); si ya existe, se reutiliza
public/fonts/instrument-sans-latin-wdth-normal.woff2 + public/fonts/OFL.txt
src/styles/global.css            fichas nuevas, @font-face, componentes, shell, vistas
src/layouts/Base.astro           sin Google Fonts; preload de la fuente; sprite de iconos
src/components/Rail.astro        lateral nuevo; topbar y velo móvil
src/scripts/nav.ts               grupos, pie, cajón (inert, Escape, foco), foco al h1
src/components/views/*.astro, src/scripts/views/*.ts   piel de cada vista (markup y clases, sin lógica)
scripts/precache.mts             la fuente entra en el esqueleto
```

### Tokens: cambio exacto en `global.css`

| Ficha | Antes | Después (claro) | Después (oscuro) |
|---|---|---|---|
| `--fill` | #FE7F2D | #C2703F | #C2703F |
| `--fill-hover` (antes `--fill-2`) | #E96C17 | #B3652F | #B3652F |
| `--on-fill` | #000000 | #000000 | #000000 |
| resto | paleta v2 | valores de la tabla del spec | valores de la tabla del spec |

Medido (WCAG 2.x): negro sobre #C2703F 5,68:1; negro sobre #B3652F 4,82:1. #B0622F daría 4,63:1 (aceptable pero más justo); se elige #B3652F.

## Plan de tests (criterio → test)

| AC | Test |
|---|---|
| 1 | `vistas-*.spec`: cada vista tiene miga, un `h1.display`, tarjetas con borde de 1 px |
| 2, 3 | `vistas-*.spec` + `componentes.spec`: como mucho un nodo visible con fondo calculado = `--fill`, y su texto es negro; ningún texto, borde ni icono con color `--fill` |
| 4 | `fichas.test` (sin `--f-display`/`--f-mono`/Newsreader/Azeret ni `fonts.googleapis`) + `componentes.spec` (`document.fonts.check('600 16px "Instrument Sans"')` sin red) |
| 5 | `componentes.spec`: `box-shadow` = none salvo `dialog` |
| 6 | `shell.spec`: iconos son `<svg><use>` del sprite; ningún emoji en botones y menú (regex Unicode `\p{Extended_Pictographic}`) |
| 7, 8 | `fichas.test` (tabla del spec, 35 + 2 parejas) + `contraste.ts` en cada `vistas-*.spec`, claro y oscuro |
| 9 | `vistas-vocab.spec`, `shell.spec`: elegido/actual lleva `aria-current`/`aria-pressed`/`checked` y cambio de borde |
| 10 | `componentes.spec`: estados de botón (hover con ratón, foco con Tab, `:active` escala 0,97, desactivado, `aria-busy`), campo (`aria-invalid` + `aria-describedby`), lista (esqueleto `aria-busy`, vacío con acción, banner con reintento) |
| 11 | `movil.spec` (proyecto móvil, `hasTouch`): acciones de fila visibles sin hover |
| 12 | `fichas.test`: cero `alert(` en `src/scripts` |
| 13 | `movil.spec`: 18 vistas + cajón + diálogo, 375 y 320 px, claro y oscuro, `scrollWidth === clientWidth` |
| 14, 15 | `shell.spec`: topbar < 960 px; cajón con `inert`, foco al ítem actual, Escape y velo cierran y devuelven el foco; redimensionar a escritorio cierra |
| 16 | `movil.spec`: dianas ≥ 44×44; campos con `font-size` 16 px |
| 17, 18, 19 | `shell.spec`, `vistas-vocab.spec`: foco al `h1` sin anillo; filtros conservan el foco; nombre accesible contiene el texto visible |
| 20 | `componentes.spec` con `reducedMotion: "reduce"`: duraciones 0, spinner estático |
| 21 | `npm test` y `npm run test:plan` sin cambios + `caracterizacion.spec` en verde de principio a fin |
| 22 | `datos.spec`: con `progreso-local-real.json` cargado, recorrer las 18 vistas y comparar `localStorage` (claves y valores) antes/después; sin escrituras nuevas salvo `theme` |
| 23 | `git diff --stat src/data` vacío en cada punto de control |
| 24 | Build Verification |

## Dependencias y orden con otras features

| Feature | Relación | Regla |
|---|---|---|
| `landing-y-acceso` | Usa la suite de la fase 1 (su tarea 0.2) y la maqueta aprobada (su 0.4); toca `Base.astro`, `index.astro`, `global.css` | Su fase 3 empieza cuando este plan cierra su fase 1 (suite) y la maqueta está aprobada. En los archivos compartidos entra **después** de la tarea del rediseño que los toca (fases 2–3 aquí). Amplía `tests/ui/fake-api.ts`, no lo duplica. |
| `selector-de-ruta` | `dom.ts`, `Base.astro`, `global.css`, `dialogo.ts` | Las fases 2+ de este plan van después de SEL cerrado (`specs/ORDEN.md`). La fase 1 no toca esos archivos y puede empezar ya. |
| `tutor-contextual`, `ruta-b2-c1` | `global.css`, vistas `grammar/uoe/quiz/mock/plan` | Este plan entra en cada vista después de sus tareas abiertas sobre ella (tabla de `ORDEN.md`); solo cambia markup y clases. |
| `backend-separado` fase 6 | Mueve `src/` a `frontend/src/` | Si ocurre antes, las rutas de `tasks.md` se actualizan en BES 6.5; la suite vive en `tests/ui/` y se mueve con el front. |
| `harness-alumno` | Monta su isla en Mi seguimiento / Cuenta | Solo piel aquí; no se toca `backend/` ni `specs/harness-alumno/`. |

## Cambios respecto al spec

| Spec | Cambio | Motivo |
|---|---|---|
| Alcance "18 vistas" | Vistas del shell (18 + Mi seguimiento cuando la construya `landing-y-acceso`) + landing fuera del shell | Decisión del dueño y spec de `landing-y-acceso`. |
| AC-24 | Se añaden `npm test`, `npm run check` y `npm run test:ui` | `.claude/CLAUDE.md` y la decisión de la suite de UI. |
| Dependencias | La suite la monta esta feature y la comparte | Evita una segunda suite en `landing-y-acceso`. |

## Riesgos

- **Una dependencia nueva** (`@playwright/test`): mantenida por Microsoft, publicada cada mes; se fija versión exacta con al menos dos semanas de antigüedad y se revisa al actualizar.
- **CSS en un solo archivo** (`global.css`, 559 líneas): el rediseño lo reescribe casi entero. Se hace por bloques (fichas → shell → componentes → vistas) con la caracterización en verde entre cada uno; nunca en paralelo con otra feature sobre el mismo archivo.
- **Pruebas de contraste frágiles** con transparencias: `contraste.ts` solo mide nodos de texto con fondo opaco resuelto; los demás se listan y se revisan a mano en el punto de control.
- **Fuente sin red en la primera visita**: cae a Helvetica/Arial (métricas parecidas); tras instalar, sale del precache.
- **Cambio de color en vuelo**: el acento cambió el 2026-11-06; cualquier captura o test anterior con #FE7F2D queda obsoleto (las capturas ya se rehicieron).

## Decisiones para el dueño

1. **Aprobar la maqueta** (`docs/diseno/maqueta-rediseno.html` y sus 24 capturas) con terracota, landing y Mi seguimiento. Bloquea la fase 2.
2. **Uso del terracota** (spec, Open Questions 2): solo botón principal (recomendado, lo que muestra la maqueta) o también barras de progreso y día actual.
3. **Mi seguimiento en "Atajos"** (spec, Open Questions 1). Recomendado: sí.
4. **Dependencia `@playwright/test`** con navegador Edge local (R-1, R-2). Bloquea la fase 1.
5. **Descargar una vez el woff2** de jsDelivr (`@fontsource-variable/instrument-sans@5.3.0`, ~50 KB, OFL) a `public/fonts/` (tarea 2.5).
