# Rediseño limpio — Progreso

## Línea base (tarea 0.1) — 2026-11-06

Árbol de trabajo de `redesign/ui` (último commit `dff25dc`) antes de tocar nada de esta feature.

- `npm test`: 94 pass / 0 fail / 0 skip.
- `npm run test:plan`: "Plan correcto en todas las rutas." (A2 → B1 y B1 → B2).
- `npm run check`: 182 archivos, 0 errores, 0 avisos, 0 sugerencias.
- `npm run build`: verde. Precache: esqueleto 11 archivos · 286 KB; contenido 10 archivos · 752 KB.

## Decisiones y dependencias (tareas 0.2 a 0.4)

- 0.2 Maqueta aprobada por el dueño el 2026-11-06 (`.agentflow/DECISIONS.md`). Preguntas abiertas del spec respondidas: terracota **solo en el botón principal** (día actual y barras en petróleo, AC-3 sin cambios); **Mi seguimiento** como vista propia en "Atajos". Anotado en `spec.md`, Open Questions.
- 0.3 Autorizado el 2026-11-06: `@playwright/test` con versión exacta de al menos dos semanas, Edge local (`channel: "msedge"`), sin descargar navegadores. También la descarga única del woff2 de Instrument Sans; ninguna tarea de las fases 0–1 la necesita, queda para 2.5.
- 0.4 `selector-de-ruta` **no está cerrado**: quedan abiertas 4.4, 6.1–6.6 (`specs/selector-de-ruta/tasks.md`). Bloquea la fase 2; la fase 1 no toca sus archivos y puede seguir.

### CP: Fase 0 — Requisitos previos — 2026-11-06
tests: 94 pass / 0 fail / 0 skip
build: pass [npm test, npm run test:plan, npm run check (182 archivos, 0/0/0), npm run build]
done: [0.1, 0.2, 0.3, 0.5]
open: [0.4 — dependencia externa, no se implementa aquí]
issues: ninguno

## Fase 1 — Suite de interfaz — 2026-11-06 (en curso, parada en 1.6)

- 1.1 `@playwright/test` **1.64.1** exacta en `devDependencies` (publicada el 2026-10-14, 23 días; la 1.65.0 es del 2026-11-05 y no cumple las dos semanas). Instalada con `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`: no se descargó ningún navegador; corre en el Edge local (`channel: "msedge"`, Edge 156). Motivo: plan R-1/R-2. `package-lock.json` además se puso al día con `package.json` (ya declaraba `@electric-sql/pglite` en `dependencies` y `engines`; el lock no lo reflejaba). Script `test:ui`; salida `test-results/` y `playwright-report/` en `.gitignore`.
  - Desviación: el `webServer` no llama a la CLI `astro preview` sino a su API (`node -e "import('astro').then(({ preview }) => preview(…))"`). Astro 7 pasa la CLI a segundo plano cuando detecta un agente (paquete `am-i-vibing`, por variables como `CLAUDECODE`) y Playwright daba el servidor por caído. Mismo servidor, mismo `dist/`, puerto 4329.
  - `serviceWorkers: "block"` por defecto: con SW activo `page.route` no ve las peticiones que sirve el SW. Las pruebas de offline (landing 3.16, 5.1) lo reactivan con `test.use({ serviceWorkers: "allow" })`.
- 1.2 Rojo antes de verde: `tests/contraste.test.mts` falló por módulo inexistente (1 fallo de carga) → 7 pass tras 1.3.
- 1.3 `tests/ui/util/contraste.ts`: `ratio`, `luminancia`, `parsearColor` (puras) y `contrasteDeNodo(locator)`. Desviación menor: recibe solo el `locator` (la tarea decía `page, locator`; la página ya va en el locator).
- 1.4 `tests/ui/util/layout.ts` (`sinScrollHorizontal`, `dianas44`) y `tests/ui/util/foco.ts` (`focoEnH1`, `recorridoTab`), con `tests/ui/util.spec.ts` sobre páginas mínimas (`page.setContent`) que prueban el caso que pasa y el que falla de cada una, más `contrasteDeNodo`. Las utilidades y su spec se escribieron juntos; los casos negativos demuestran que cada aserción falla cuando debe. `recorridoTab` se salta en los proyectos táctiles.
- 1.5 `tests/ui/fake-api.ts` y `tests/ui/fixtures.ts`. Comprobado contra la app actual (spec de humo fuera del repo): arranca sin errores de consola ni peticiones sin simular; la primera versión detectó `GET /api/readings?track=b1b2` al arrancar (no estaba en la lista de la tarea) y se añadió a la base con `{ textos: [] }`. Con `progresoReal` y sin el archivo, falla con "Falta …progreso-local-real.json (tarea 1.6 …)".
- 1.6 **Bloqueada**: `tests/fixtures/progreso-local-real.json` no existe (ni `ruta-b2-c1` ni `landing-y-acceso` lo han dejado). Hace falta un "Exportar progreso" real del dueño (Ajustes → Copia de seguridad), que se anonimiza con las reglas de `landing-y-acceso` 0.5 (textos de writing y de errores sustituidos por texto de la misma longitud; sin `ai`). Sin él no se pueden hacer 1.7 y 1.8 ("con y sin el progreso real"), ni el punto de control 1.10.

Estado de las suites al parar (no es el punto de control):
- `npm test`: 101 pass / 0 fail (94 de la línea base + 7 de `contraste.test.mts`).
- `npm run test:plan`: "Plan correcto en todas las rutas."
- `npm run check`: 190 archivos, 0 errores, 0 avisos, 0 sugerencias.
- `npm run build`: verde; precache igual que la línea base (11 archivos · 286 KB; 10 · 752 KB).
- `npm run test:ui`: 28 pass / 2 skip (`recorridoTab` en `movil-375` y `movil-320`) / 0 fail.
- `git diff --stat src/data`: vacío.
