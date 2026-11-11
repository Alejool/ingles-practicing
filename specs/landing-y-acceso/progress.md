# Landing y acceso con cuenta — Progreso

## Fase 0 — Requisitos previos — 2026-11-07

### 0.1 Línea base (antes de tocar nada de esta feature)
- `npm test`: **105/105**.
- `npm run test:plan`: "Plan correcto en todas las rutas".
- `npm run check`: 194 archivos, 0 errores, 0 avisos, 0 pistas.
- `npm run build`: correcto. Precache: esqueleto **11 archivos · 286 KB**; contenido 10 archivos · 752 KB.
- `npm run test:ui`: 28 pasan, 2 saltadas (solo `tests/ui/util.spec.ts`).

### 0.2 Suite de interfaz (de `rediseno-limpio` fase 1)
- Comando: `npm run test:ui` (`playwright test`, `@playwright/test` 1.64.1, Edge local por `channel: "msedge"`; en CI Chromium).
- Carpeta: `tests/ui/*.spec.ts`; configuración en `playwright.config.ts`.
- Build servido: `webServer` ejecuta `npm run build:fast` y la API de `astro preview` en `127.0.0.1:4329` (reutiliza un servidor ya levantado fuera de CI). Proyectos: escritorio 1440×900, `movil-375`, `movil-320`.
- `serviceWorkers: "block"` por defecto: el test offline de 3.16 lo activa por archivo.
- Utilidades: `tests/ui/util/contraste.ts` (`ratio`, `contrasteDeNodo`), `tests/ui/util/layout.ts` (`sinScrollHorizontal`, `dianas44`), `tests/ui/util/foco.ts` (`focoEnH1`, `recorridoTab`); `tests/ui/fake-api.ts` (`simularApi`, ampliable con manejadores `"MÉTODO /api/ruta"`); `tests/ui/fixtures.ts` (test extendido: falla con errores de consola, peticiones a `/api` sin simular o a terceros; opción `progresoReal`).
- Nota: las tareas 1.7–1.10 de `rediseno-limpio` siguen abiertas (caracterización y documentación), pero la suite corre y basta para las fases 3+.

### 0.3 `ruta-b2-c1` 2.4–2.6
Hechas en esta sesión (ver `specs/ruta-b2-c1/progress.md`): `src/scripts/merge.ts` extraído sin cambiar lógica, `tests/merge.test.mts` con caracterización + unión de rutas, 12/12.

### 0.4 Maqueta
Aprobada por el dueño el 2026-11-06 (`.agentflow/DECISIONS.md`): `docs/diseno/maqueta-rediseno.html` con la landing (`#landing`) y capturas `docs/diseno/capturas/{desk,mob}-{light,dark}-landing.png`. Terracota #C2703F solo en el botón principal.

### 0.5 Fixtures reales — BLOQUEADA
El dueño aún no ha exportado sus dos "Exportar copia". No existe `tests/fixtures/`. Bloquea 1.9–1.10 (reglas de fusión de AC-13 con fixtures reales) y la fase 4.

### 0.6 [C] Punto de control
Línea base y dependencias anotadas. Decisiones del dueño (2026-11-06) que ya cierran las "Decisiones para el dueño" del plan: 1) fusión por campo con la tabla; 2) el diagnóstico gratis se pierde si el enlace se abre en otro navegador; 3) la clave propia guardada se vacía una vez con aviso (cierra 6.1); 4) "Mi seguimiento" es vista propia en el lateral (Atajos); 5) bienvenida con IA (~1 crédito), fase 8.

## Fase 1 — Lógica pura — 2026-11-07

Cada test se escribió y se vio en rojo (módulo inexistente) antes de su implementación.

- 1.1–1.4 `src/scripts/diag-muestra.ts` + `tests/diag-muestra.test.mts` (16): `muestraDiag` fija las diez de hoy (b1b2 `d1,d4,…,d28`; a2b1 `d1,d3,d6,d8,d11,d13,d16,d18,d21,d23`); `puntuar` → `{respuestas, aciertos, total, pct, porArea[{area, ok, n, banda}], semana, dia}`, bandas `debajo` < 50 ≤ `nivel` ≤ 75 < `encima`, escala 1/4/9/13; faltan respuestas → `Error("Faltan N respuesta(s)…")`; ids ajenos ignorados. `aplicarResultado(estado, ruta, puntuacion)` → `"aplicado"` / `"ignorado"` (diagnóstico empezado o hecho en esa ruta); ruta sin progreso → error explícito. El onboarding aún usa su `muestra()` propia: pasa a `diag-muestra.ts` en 4.10.
- 1.5–1.6 `src/scripts/relevo-diag.ts` + `tests/relevo-diag.test.mts` (16): `validar`/`leer`/`serializar` (`{v:1, track, respuestas, hecho}`; rechaza versión, ruta fuera de `TRACK_META`, ids fuera de las diez, menos de diez, índices de opción inválidos, JSON roto), mensajes `{tipo:"pide"}`/`{tipo:"da", resultado}`, adaptadores inyectables (`guardar`/`leerDe`/`quitar`, `darAlPedir` borra la copia tras responder, `pedir` con espera).
- 1.7–1.8 `src/scripts/cuenta-local.ts` + `tests/cuenta-local.test.mts` (14): `idDeCuenta` (SHA-256, 16 hex, correo normalizado, asíncrono por `crypto.subtle`), `alinear` ADOPTAR/IGUAL/CAMBIAR con escrituras transaccionales (si una falla, se deshacen las anteriores y devuelve el motivo), `salir`, `puedeEntrar`, `leerMarcador`, `CLAVES_POR_CUENTA` comprobado contra `state.ts`/`sync.ts`. Decisión de implementación: el tema se repone en el `v1` restaurado solo si es distinto (así volver a A es byte a byte). Etiquetar la cola de IA al adoptar queda para la fase 4 (IndexedDB, no es lógica pura).
- 1.9–1.10 **BLOQUEADAS**: necesitan los fixtures reales de 0.5.
- 1.11–1.12 `src/scripts/bienvenida.ts` + `tests/bienvenida.test.mts` (8): niveles por área con texto, tres puntos (menor acierto, empates por orden), hoy (día, semana = ⌊(día−1)/5⌋+1, bloques sin HTML), texto plano.

### 1.13 [C] Punto de control
- `npm test`: **172/172** (105 de base + 67 nuevos en `merge`, `diag-muestra`, `relevo-diag`, `cuenta-local` y `bienvenida`).
- `npm run test:plan`: correcto. `npm run check`: 204 archivos, 0/0/0. `npm run build`: correcto, esqueleto 11 archivos · 286 KB (sin cambios: nada de esto entra aún en ningún bundle salvo `merge.ts`).
- AC de la fase: AC-6b/AC-24 (lógica de `aplicarResultado` y relevo), AC-12/14/18/20 (lógica de `cuenta-local`), AC-25 (plantilla). AC-13 pendiente de 1.9.

## Fase 2 — La IA exige sesión (AC-21) — 2026-11-07

- 2.1 Contrato `tests/contract/ai-chat.test.mts`: nuevos "sin Authorization → 401 sin fila ni petición al simulado", "token caducado/desconocido → 401", "sin sesión ni con `device_id` en el cuerpo", "401 antes que `bad_json`, 413 y `bad_kind`"; los 405 siguen sin sesión (405 antes que 401). Fuera los dos casos anónimos (`anon_limit`, gasto por IP); el resto lleva sesión (`conSesion()` por test que gasta, `tokenComun()` para los rechazos sin reserva); el 200 espera ahora cuota de usuario (`58`/`60`, fila con `user_id`). **Rojo contra Node: 4/33.** `tests/contract/admin.test.mts` (líneas 165 y 177) pasa el token de su usuario a `/api/ai/chat`; **no se ejecuta** (borra filas).
- Bloqueado/caducado no se pueden preparar en el contrato sin escribir en la base: `tests/ai-chat-sesion.test.mts` (Node + pglite en memoria, 7 casos; rojo 4/7) y `ChatEndpointTest` (Laravel, en transacción).
- 2.2 Node: `requireUser(req)` tras el 405 y antes de `readJson`. `tests/quota.test.mts` ("si DeepSeek revienta…") pasa a llevar sesión en pglite. Laravel: `ChatController` llama a `ResolveSession::require` antes de `toCommand()`. `ChatEndpointTest`: sesión de prueba en `setUp`, cuota de usuario, nuevos 401 (orden y sin reserva), caducada, bloqueada antes del cuerpo, `user_daily_limit` en lugar de `anon_limit`. Rojo 3/10 → verde 10/10.
- 2.3 Revisión de seguridad (a mano sobre el diff, sin el comando): sin sesión no hay lectura del cuerpo, reserva ni `fetch` al proveedor (lo prueban los tests de las dos pilas); el 403 de cuenta bloqueada también va antes del cuerpo; ningún log nuevo, y los existentes (`ResolveSession::touch`) no llevan el token. `/api/quota` y `/api/auth/session` sin cambios (K-13). Sin hallazgos.
- 2.4 [C] `npm test` **179/179**; `npm run check` 205 archivos 0/0/0. PHPUnit completo **378/378**. Contrato sin `admin` contra Node **188/188 dos veces seguidas**; contra Laravel **188/188 dos veces**. Stacks: Node bajado (`contract:down`), Laravel normal restaurado.
- Consecuencia pendiente (fase 6): el cliente sin cuenta aún ofrece IA anónima y clave propia; hoy recibe 401. Lo quita AC-22.

### Corrección de revisión — `cuenta-local.ts` (2026-11-09)
- Hallazgo: en CAMBIAR, una clave por cuenta ausente en la cuenta que sale dejaba vivo un `<clave>@<idViejo>` antiguo; al volver esa cuenta se restauraba (p. ej. una `ruta-b1b2-sync-version` caducada → 409).
- Test primero en `tests/cuenta-local.test.mts` (rojo 1/15) → arreglo dentro de la misma transacción: sin valor, `quitar(<clave>@<idViejo>)`. 15/15.

## Fase 3 — Landing pública — 2026-11-09

Skills de diseño invocados antes de maquetar: `frontend-design` (la maqueta aprobada manda: se sigue tal cual) y `emil-design-eng` (`:active` a 0,97 en botones y respuestas, curva `--l-ease`, hover solo con puntero fino, movimiento reducido global ya existente, sin animaciones de entrada).

- 3.1 `tests/landing-aislada.test.mts` (3): rojo 2/3 → verde. Recorre imports (sin `import type`) desde cada archivo de `src/scripts/landing/`; control: desde `main.ts` de la app sí encuentra `state`.
- 3.2–3.3 `tests/ui/acceso-guardia.spec.ts` (12 × 3 tamaños): rojo 10/12 → verde. Guardián en línea en el `<head>` de `index.astro` (slot `head` nuevo en `Base.astro`, consciente de `BASE_URL`, `localStorage` en `try`; marcador validado como en `cuenta-local.ts`); `cartelCarga` en `Base.astro`; simetría en `landing/main.ts`. **Desviación:** el navegador pide la etiqueta `<script>` de `index.astro` antes de que el guardián termine de irse (escáner de precarga). Por eso la entrada pasa a `src/scripts/arranque.ts` (cuatro líneas: si el guardián marcó `data-acceso="fuera"` no carga nada; si no, `import("./main")`). El test exige que no se pidan `main`/`state`/`nav`/`sync`/`track`; la entrada mínima sí se pide. La fase 4 amplía `arranque.ts` como dice el plan.
- 3.4–3.5 `tests/ui/landing-contenido.spec.ts` (14 × 3): rojo 12/14 → verde. `src/pages/bienvenida.astro` según la maqueta (cabecera, héroe con entrada, tarjeta de prueba, 24 semanas, "Prueba sin cuenta", "Con cuenta tienes todo", pie). Estilos en un bloque `.landing`/`l-*` al final de `global.css`; fichas nuevas `--l-bg`, `--l-muted`, `--l-border`, `--l-control`, `--l-focus`, `--l-fill` (#C2703F), `--l-fill-hover`, `--l-ease` en los tres bloques de fichas (valores de la maqueta; se funden con las del rediseño en `rediseno-limpio` 2.2). Añadido a la maqueta: selector de ruta de la muestra dentro de la tarjeta (el plan pide que la ruta la elija el visitante).
- 3.6–3.7 `tests/muestra-datos.test.mts` (6): rojo → verde. `landing/muestra-datos.ts`: diez de `muestraDiag`, 8 tarjetas del primer mazo, primer audio, primera transformación; mismos objetos; `preguntasDe` para el relevo (`Object.hasOwn`, "constructor" no es ruta).
- 3.8–3.13 `tests/ui/landing-muestra.spec.ts` (9 × 3): rojo → verde. `landing/{comun,diagnostico,tarjetas,escucha,uoe,main}.ts`. Diagnóstico con explicación por pregunta, resultado por área con banda, repaso de las diez y guardado en `sessionStorage["ruta-muestra-diag"]` vía `relevo-diag.ts`; al recargar se ve el resultado con "se pierde al cerrar la pestaña". Escucha con `hablarGuion` (tres pases; sin voz, aviso y transcripción). Fotos de `localStorage`/`sessionStorage`/IndexedDB/cookies iguales salvo esa clave; cero peticiones con coste.
- 3.14–3.15 `tests/ui/landing-entrada.spec.ts` (14 × 3): rojo → verde. `api.ts`: opción `{ dispositivo: false }` en `headers`/`get`/`send`/`requestLoginLink` (por defecto, lo de siempre). `landing/entrada.ts`: errores bajo el campo con `aria-invalid`/`aria-describedby`/`role=alert` sin vaciarlo (`bad_email`, `mail_failed`, `too_many_links`, `accounts_off`, red), `accounts:false` o sin API → aviso y formulario desactivado, `#acceso=caducado|error`, "Revisa tu correo" con minutos y buzón local; ninguna petición con `X-Device-Id` y sin `ruta-b1b2-device`.
- 3.16–3.17 `tests/precache.test.mts` (4) y `tests/ui/landing-offline.spec.ts` (1 × 3): rojo → verde. `scripts/precache-lib.mts` (`clasificar`, nuevo: C1 3.2 no existía) usado por `precache.mts`; páginas `./bienvenida/` y `./bienvenida/index.html` en el esqueleto. `sw.js`: respaldo de navegación por página y **`ignoreVary: true`** en las búsquedas de caché: sin él, sin red los módulos JS (que llevan `Origin`) no casaban con lo precacheado y la landing no arrancaba. El fallo era previo y afectaba también a la app sin red. La landing registra el service worker (solo en producción, como la app).
- Medida: la landing añade **≈48 KB gzip** (bundle 6,5 KB + `voice` 3,6 KB + dos trozos de datos de muestra 15,4 y 17,8 KB + página 4,2 KB; ≤ 60 KB). El esqueleto pasa de 11 archivos · 286 KB a 18 · 411 KB (sin comprimir) y el contenido de 752 a 668 KB: los cuatro archivos de datos de cada ruta que usa la muestra salen del bundle de contenido a trozos compartidos.

### 3.18 [C] Punto de control
- `npm test` **193/193**; `npm run test:plan` correcto; `npm run check` 224 archivos 0/0/0; `npm run build` correcto; `npm run test:ui` **178 pasan, 2 saltadas** (las de `util.spec.ts`), en escritorio, 375 y 320 px; la prueba "con progreso…" repetida 24 veces sin fallos.
- AC comprobados: AC-1 (guardia), AC-2 y AC-23 (contenido, un solo relleno terracota, Instrument Sans declarada, claro/oscuro, foco, teclado, 320/375 px, contraste ≥ 4,5), AC-3 a AC-6 (muestra), AC-6b (parte de la landing: guardar/recargar; la aplicación en la app es 4.9–4.10), AC-7 (offline), AC-8, AC-10, AC-11 (entrada).
- `design:design-critique` (capturas claro/oscuro, escritorio/móvil, contra `docs/diseno/capturas/*-landing.png`): fiel a la maqueta. Arreglado: los cuatro "Empezar" pasaban a pesar lo mismo que un secundario → discretos como en la maqueta; la raya del pie sobresalía del contenido → pseudo-elemento alineado al contenido; huérfana en la pista del correo → `text-wrap: pretty`.
- `design:accessibility-review` (WCAG 2.1 AA): arreglado: `aria-live` en el cuerpo de la tarjeta repetía la tarjeta entera en cada cambio además de `anunciar()` → quitado (foco + `anunciar` bastan); cambiar la ruta de la muestra se anuncia; el aviso de enlace caducado/erróneo recibe el foco al cargar (un `role=alert` presente al cargar no siempre se anuncia). Revisado sin hallazgos: etiquetas, `lang="en"`, `legend` del selector, dianas de 44 px, contraste de bordes de control (≥ 3:1), orden de foco.
- Pendiente fuera de esta fase: Instrument Sans sigue viniendo de Google Fonts (`rediseno-limpio` 2.5); sin red se ve la fuente de respaldo. `global.css` es un archivo de varias features (ORDEN): el bloque de la landing va al final y solo añade.

### Corrección de revisión de código (fases 1–3) — 2026-11-09/11
Cada arreglo tiene antes su test (visto en rojo salvo donde se indica).
1. `landing/entrada.ts`: si "Reenviar el enlace" falla, se vuelve a enseñar el formulario **antes** de pintar el error (`pedir(…, alFallar)`), así el foco cae en `#lmail` y el error se anuncia. Test `landing-entrada.spec` "reenviar falla" (rojo → verde).
2. `cuenta-local.ts` paso 4: el tema solo se repone si el `v1` restaurado se puede parsear; un archivo que no es JSON se restaura con sus bytes y el cambio de cuenta ya no se deshace. Test con archivo corrupto (rojo → verde) y otro de `salida` no textual.
3. Guardián de `index.astro`: misma regla que `leerMarcador`/`puedeEntrar` (`typeof id`, `salida` null o texto). Nuevo `tests/guardian.test.mts` (14): extrae el script en línea y lo ejecuta con `vm` contra los mismos casos que `puedeEntrar`. Nota: los veredictos ya coincidían (solo `salida === null` deja pasar), así que este test nació en verde; fija la regla para el futuro.
4. `landing/main.ts`: pasa a la app con la misma regla que el guardián (token, o marcador válido con `salida` null). Test en `acceso-guardia.spec` (rojo → verde). **Para la fase 5 (AC-18):** el "Entrar" del aviso de sesión caducada lleva a la landing con el marcador activo; con esta regla rebotaría a la app. Hace falta una excepción explícita (p. ej. `#acceso=reentrar`) en la landing al implementar 5.5.
5. `landing/entrada.ts`: `CORREO = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/` (admite punycode como `.xn--p1ai`; el servidor valida). Test (rojo → verde).
6. `public/sw.js`: `paginaSinRed()` solo manda a la landing `<base>bienvenida` y lo que cuelga de `<base>bienvenida/` (no `/bienvenidas`). Nuevo `tests/sw.test.mts` (3, carga `sw.js` en `vm`; rojo → verde).
- Resultados: `npm test` **211/211**; `npm run check` 226 archivos 0/0/0; `npm run build` correcto (esqueleto 18 · 412 KB); `npm run test:ui` **190 pasan, 2 saltadas**. Docker no se usó (el motor estaba caído).
