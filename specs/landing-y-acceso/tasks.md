# Landing y acceso con cuenta — Tareas

Fuente: `specs/landing-y-acceso/spec.md` y `plan.md`. Progreso de cada sesión en `specs/landing-y-acceso/progress.md` (lo crea la tarea 0.1).

Leyenda: `[ ]` pendiente · `[~]` en curso · `[x]` hecha · `[P]` paralelizable con las otras `[P]` de su fase (archivos disjuntos) · `[C]` punto de control · **[AUT]** necesita autorización explícita del dueño antes de ejecutarse · **[DEC]** espera una decisión del dueño (sección "Decisiones para el dueño" del plan).

Reglas:
- Test primero: cada "Test" se escribe, se ejecuta y se ve fallar antes de su "Implementar".
- Unitarios con `node:test` en `tests/*.test.mts` (entran en `npm test`). Navegador con la suite Playwright que monta `specs/rediseno-limpio/` (se supone `tests/ui/` y `npm run test:ui`; la tarea 0.2 fija los nombres reales y, si cambian, se sustituyen aquí).
- Comandos de punto de control (`.claude/CLAUDE.md`): `npm test`, `npm run test:plan`, `npm run check`, `npm run build`; más `npm run test:ui` desde la fase 3 y la batería de contrato (`npm run contract:up` + `npm run test:contract` + `npm run contract:down`) en la fase 2.
- En cada `[C]`: suite y build en verde, marcas de tareas revisadas, criterios del spec de la fase comprobados y resultado anotado en `progress.md`.
- Archivos compartidos con otras features: se respeta el orden de `specs/ORDEN.md` y la tabla "Conflictos con otras features" del plan. Tras BES 6.2 las rutas `src/…` pasan a `frontend/src/…` (las actualiza BES 6.5).

## Fase 0 — Requisitos previos

- [ ] 0.1 Línea base: `npm test`, `npm run test:plan`, `npm run check`, `npm run build` en verde; anotar números (tests, archivos de `check`, tamaño del esqueleto que imprime `precache`) en `progress.md`.
  - Archivos: `specs/landing-y-acceso/progress.md`.
- [ ] 0.2 Dependencia (no se implementa aquí): la suite de interfaz de `specs/rediseno-limpio/tasks.md` (Playwright, versión fijada) existe y corre en local contra el build. Anotar comando, carpeta, cómo se sirve el build y qué utilidades trae (contraste, scroll horizontal, foco). Sin ella no empiezan las fases 3 a 8; las fases 1 y 2 sí.
- [ ] 0.3 Dependencia: `ruta-b2-c1` 2.4–2.6 hechas (`src/scripts/merge.ts` extraído, `tests/merge.test.mts` de caracterización en verde). Sin ellas no empieza 1.9.
- [ ] 0.4 Dependencia: maqueta del rediseño con la landing aprobada (`docs/diseno/maqueta-rediseno.html`). Sin ella no empieza 3.5.
- [ ] 0.5 Fixtures reales: dos "Exportar copia" de navegadores reales del dueño (uno con semanas de progreso sin cuenta, otro de una cuenta con progreso distinto), anonimizados (textos de writing y de errores sustituidos por texto de la misma longitud; sin `ai`). Si C1 2.x ya dejó fixtures reales, se reutilizan y se anota.
  - Archivos: `tests/fixtures/progreso-local-real.json`, `tests/fixtures/progreso-cuenta-real.json`.
- [ ] 0.6 [C] Punto de control: línea base y dependencias anotadas en `progress.md`.

## Fase 1 — Lógica pura (sin interfaz)

- [ ] 1.1 [P] Test (falla primero): `muestraDiag(items, 10)` devuelve exactamente las diez del onboarding de hoy para el `DIAG` real de `a2b1` y de `b1b2` (caracterización); `puntuar(items, respuestas)` → aciertos, `pct`, `porArea` (`ok`, `n`, banda < 50 / 50–75 / > 75), semana (escala 1/4/9/13 de `onboarding.ts`) y día; menos de diez respuestas → error explícito; ids ajenos se ignoran. (AC-3, AC-6b)
  - Archivos: `tests/diag-muestra.test.mts`.
- [ ] 1.2 [P] Implementar `src/scripts/diag-muestra.ts` (solo tipos de `src/data/types.ts`; sin `state.ts`).
  - Archivos: `src/scripts/diag-muestra.ts`.
- [ ] 1.3 Test (falla primero): `aplicarResultado(estado, resultado)` escribe en `tracks[ruta]` `diag = {answers, done:false, score}`, `stats.diag` y `current = dia`, y `track = ruta`; con diagnóstico ya empezado o hecho en esa ruta devuelve `"ignorado"` y no cambia nada; el resto del estado queda igual (comparación profunda). (AC-6b, AC-24)
  - Archivos: `tests/diag-muestra.test.mts`.
- [ ] 1.4 Implementar `aplicarResultado`.
  - Archivos: `src/scripts/diag-muestra.ts`.
- [ ] 1.5 [P] Test (falla primero): `relevo-diag` — serializar/leer `{v:1, track, respuestas, hecho}`; rechaza otra versión, ruta fuera de `TRACK_META`, ids que no están en las diez de esa ruta, menos de diez respuestas, JSON roto; mensajes del canal `{tipo:"pide"}` / `{tipo:"da", resultado}` con forma fija; con adaptadores falsos de `sessionStorage` y canal: "dar" borra la copia local tras responder. (AC-6b)
  - Archivos: `tests/relevo-diag.test.mts`.
- [ ] 1.6 [P] Implementar `src/scripts/relevo-diag.ts` (partes puras + adaptadores inyectables).
  - Archivos: `src/scripts/relevo-diag.ts`.
- [ ] 1.7 [P] Test (falla primero) con un `Storage` en memoria: `idDeCuenta` (normaliza mayúsculas y espacios, SHA-256, 16 hex, estable); `alinear` → ADOPTAR (marcador escrito, `ruta-b1b2-v1-copia` igual byte a byte, `v1` intacto), IGUAL (borra `salida`), CAMBIAR (archivo `@idA` byte a byte de `v1` y versión; `v1` = archivo de B o ausente; tema conservado; volver a A restaura byte a byte); un `Storage` que falla al escribir → `alinear` no cambia nada y devuelve el motivo; `salir()` solo pone `salida`; `puedeEntrar(token, marcador)`; `CLAVES_POR_CUENTA` coincide con las cadenas de `state.ts` (`KEY`), `sync.ts` (`VERSION_KEY`) leídas del fuente. (AC-12, AC-14, AC-18, AC-20)
  - Archivos: `tests/cuenta-local.test.mts`.
- [ ] 1.8 [P] Implementar `src/scripts/cuenta-local.ts` (sin imports de la app).
  - Archivos: `src/scripts/cuenta-local.ts`.
- [ ] 1.9 Test (falla primero): reglas de fusión de AC-13 en `merge.test.mts`, una prueba por fila "nuevo"/"cambia" de la tabla del plan (`known`, `seen`, `onboarded`, `gram` por pregunta, `writing.chk` OR, `srs` por `seen`) y por fila "igual"; propiedades: `merge(a,a) == a`, ningún elemento de ninguno de los dos lados desaparece salvo sustituido por uno más avanzado/reciente de su misma clave, idempotencia; con los dos fixtures reales de 0.5. La caracterización de C1 2.4 se actualiza solo en esas filas, con el motivo en el test. (AC-13, AC-19)
  - Archivos: `tests/merge.test.mts`.
- [ ] 1.10 Implementar las reglas en `src/scripts/merge.ts`.
  - Archivos: `src/scripts/merge.ts`.
- [ ] 1.11 [P] Test (falla primero): `bienvenida(resultado, dia, bloques)` → nivel por área con banda, tres puntos (las tres áreas con menor acierto; empates por orden del diagnóstico), hoy (día, semana, títulos de los bloques); dos diagnósticos distintos → mensajes distintos; texto plano sin HTML. (AC-25)
  - Archivos: `tests/bienvenida.test.mts`.
- [ ] 1.12 [P] Implementar `src/scripts/bienvenida.ts`.
  - Archivos: `src/scripts/bienvenida.ts`.
- [ ] 1.13 [C] Punto de control: `npm test`, `npm run test:plan`, `npm run check`, `npm run build`; anotar en `progress.md`.

## Fase 2 — Servidor: la IA exige sesión (AC-21)

Regla de `backend-separado` (API Node congelada desde BES 1.13): contrato y servidor cambian en la misma tarea. Hacer esta fase **antes** de que empiece BES lote c; si ya empezó, 2.2 incluye `ChatController`.

- [ ] 2.1 Test (falla primero contra Node): en `tests/contract/ai-chat.test.mts`, sin `Authorization` → 401 `not_authenticated`, sin fila nueva en `ai_usage` y sin petición al proveedor simulado; token caducado → 401; usuario bloqueado → 403 `account_blocked`; método distinto de POST sigue dando 405 antes que 401; 401 antes que `bad_json`, 413 y `bad_kind`. Los casos anónimos (`anon_limit`, gasto heredado por IP) se sustituyen por "sin sesión → 401"; `too_fast` y el resto pasan a llevar sesión (ayudante de `_lib.mts` si hace falta). `npm run contract:up` + `npm run test:contract`: los nuevos en rojo.
  - Archivos: `tests/contract/ai-chat.test.mts`, `tests/contract/_lib.mts`.
- [ ] 2.2 Implementar: `requireUser(req)` en `netlify/functions/ai-chat.mts` tras el 405 y antes de leer el cuerpo. Contrato entero verde contra Node dos veces seguidas; `tests/quota.test.mts` verde. Si BES lote c ya existe: mismo orden en `backend/app/Http/Controllers/Ai/ChatController.php` con la resolución de sesión de lote a, test Feature y contrato verde contra Laravel. Si no: nota en `specs/backend-separado/progress.md` de que c.6 implementa el contrato nuevo.
  - Archivos: `netlify/functions/ai-chat.mts` (y, según el caso, `backend/…/ChatController.php`, su test, `specs/backend-separado/progress.md`).
- [ ] 2.3 Revisión de seguridad del diff (`/security-review`): orden de comprobaciones, ninguna reserva ni llamada sin sesión, sin token en logs. Hallazgos en `progress.md`.
- [ ] 2.4 [C] Punto de control: `npm test`, `npm run check`, batería de contrato contra Node (y Laravel si aplica); anotar número de tests.

## Fase 3 — Landing pública

- [ ] 3.1 Test (falla primero): `tests/landing-aislada.test.mts` exige que exista `src/scripts/landing/main.ts` y que ningún archivo de `src/scripts/landing/` importe, directa o transitivamente dentro de `src/scripts/`, `state`, `sync`, `queue`, `ai`, `pulse`, `library`, `progress`, `track`, `nav` ni `views/`. (AC-4, AC-5)
  - Archivos: `tests/landing-aislada.test.mts`.
- [ ] 3.2 Test (falla primero): `tests/ui/acceso-guardia.spec.ts` — sin sesión, `/`, `/#plan`, `/#cuenta`, `/#ajustes` acaban en `/bienvenida/` sin que se pida ningún bundle de la app ni aparezca una vista de estudio; con token → app; con marcador activo sin token → app; con `salida` → landing; `/#auth=expired` y `/#auth=error` → landing con su aviso; en la landing con token → app. (AC-1)
  - Archivos: `tests/ui/acceso-guardia.spec.ts`, `tests/ui/fake-api.ts`.
- [ ] 3.3 Implementar: guardián en línea en el `<head>` de `index.astro` (consciente de `BASE_URL`, accesos a `localStorage` en `try`); `src/pages/bienvenida.astro` mínima; prop `cartelCarga` en `Base.astro`; `src/scripts/landing/main.ts` con la redirección simétrica. 3.1 y 3.2 en verde.
  - Archivos: `src/pages/index.astro`, `src/pages/bienvenida.astro`, `src/layouts/Base.astro`, `src/scripts/landing/main.ts`.
- [ ] 3.4 Test (falla primero): `tests/ui/landing-contenido.spec.ts` — explicación con las rutas de `TRACK_META`, 24 semanas y qué se practica; exactamente un control con relleno `--fill` ("Entrar con tu correo") que lleva al campo de correo; Instrument Sans; claro y oscuro; foco visible; recorrido completo con teclado; 375 y 320 px sin scroll horizontal; contraste de las parejas usadas con las utilidades del rediseño; línea de "tu progreso sigue en este navegador" solo si hay `ruta-b1b2-v1`. (AC-2, AC-23)
  - Archivos: `tests/ui/landing-contenido.spec.ts`.
- [ ] 3.5 Implementar el marcado y los estilos de la landing según la maqueta aprobada (0.4), solo con tokens.
  - Archivos: `src/pages/bienvenida.astro`, `src/styles/global.css` (bloque de la landing, después de las tareas del rediseño en ese archivo).
- [ ] 3.6 [P] Test (falla primero): `tests/muestra-datos.test.mts` — por cada ruta de `TRACK_META`: diez preguntas iguales a `muestraDiag(DIAG, 10)`, 8 tarjetas del primer mazo, el primer audio y la primera transformación; mismos objetos que `src/data/` (sin copias editadas); determinista. (AC-3)
  - Archivos: `tests/muestra-datos.test.mts`.
- [ ] 3.7 [P] Implementar `src/scripts/landing/muestra-datos.ts`.
  - Archivos: `src/scripts/landing/muestra-datos.ts`.
- [ ] 3.8 Test (falla primero): `tests/ui/landing-muestra.spec.ts` — elegir ruta; diagnóstico de diez preguntas con resultado por área y repaso; tarjetas "lo sé / no lo sé"; escucha con tres pases (`speechSynthesis` simulado; sin voz, transcripción y aviso); Use of English con corrección inmediata; tras cada actividad, su resultado concreto y "Entrar con tu correo" (secundario, lleva al campo) sin bloquear "Seguir probando". Fotos de `localStorage`, `sessionStorage`, `indexedDB.databases()` y cookies antes y después: iguales salvo `sessionStorage["ruta-muestra-diag"]`; recarga → tarjetas, escucha y UoE de cero y el resultado del diagnóstico presente con su nota; registro de peticiones: ninguna a `/api/ai/`, `/api/pulse`, `/api/progress`, `/api/readings`, `/api/harness/`, `/api/learner/` ni a DeepSeek. (AC-3, AC-4, AC-5, AC-6)
  - Archivos: `tests/ui/landing-muestra.spec.ts`.
- [ ] 3.9 [P] Implementar el diagnóstico de la muestra (con `diag-muestra.ts` y la escritura en `sessionStorage` vía `relevo-diag.ts`).
  - Archivos: `src/scripts/landing/diagnostico.ts`.
- [ ] 3.10 [P] Implementar las tarjetas de la muestra.
  - Archivos: `src/scripts/landing/tarjetas.ts`.
- [ ] 3.11 [P] Implementar la escucha de la muestra (con `voice.ts`).
  - Archivos: `src/scripts/landing/escucha.ts`.
- [ ] 3.12 [P] Implementar Use of English de la muestra.
  - Archivos: `src/scripts/landing/uoe.ts`.
- [ ] 3.13 Montar las cuatro actividades y sus llamadas a entrar en `landing/main.ts`. 3.8 en verde.
  - Archivos: `src/scripts/landing/main.ts`, `src/pages/bienvenida.astro`.
- [ ] 3.14 Test (falla primero): `tests/ui/landing-entrada.spec.ts` con la API simulada — correo inválido en el cliente y 422 `bad_email`; 502 `mail_failed`; 429 `too_many_links`; 404 `accounts_off`; sin red; `accounts:false` al cargar → aviso "La entrada no está disponible ahora" y formulario desactivado; sin API (404 HTML) → mismo aviso; `#acceso=caducado` y `#acceso=error` → su aviso; en todos, el correo escrito sigue en el campo, `aria-invalid`/`aria-describedby` y el mensaje se anuncia; éxito → "revisa tu correo" (y buzón local con `delivery:"mailbox"`); ninguna petición lleva `X-Device-Id` y `ruta-b1b2-device` no aparece. (AC-8, AC-10, AC-11)
  - Archivos: `tests/ui/landing-entrada.spec.ts`.
- [ ] 3.15 Implementar: opción `{ dispositivo: false }` en `api.get`/`api.send`/`requestLoginLink` (por defecto, lo de hoy) y `src/scripts/landing/entrada.ts`.
  - Archivos: `src/scripts/api.ts`, `src/scripts/landing/entrada.ts`.
- [ ] 3.16 Test (falla primero): `tests/ui/landing-offline.spec.ts` sobre el build servido (`npm run build` + `astro preview`): cargar `/bienvenida/`, esperar al SW, cortar la red, recargar y jugar las cuatro actividades; el formulario dice que hace falta red. Test de clasificación del precache: la landing y sus bundles en el esqueleto (extiende el de `scripts/precache-lib.mts` si C1 3.2 existe; si no, uno nuevo). (AC-7)
  - Archivos: `tests/ui/landing-offline.spec.ts`, `tests/precache*.test.mts`.
- [ ] 3.17 Implementar: `./bienvenida/` y `./bienvenida/index.html` en el esqueleto de `precache.mts`; respaldo de navegación por página en `sw.js`. Medir lo que añade la landing al esqueleto (≤ 60 KB gzip) y anotarlo.
  - Archivos: `scripts/precache.mts` (o `scripts/precache-lib.mts`), `public/sw.js`.
- [ ] 3.18 [C] Punto de control: `npm test`, `npm run test:plan`, `npm run check`, `npm run build`, `npm run test:ui`; AC-1 a AC-8, AC-10, AC-11 y AC-23 comprobados; `design:design-critique` y `design:accessibility-review` sobre la landing; anotar.

## Fase 4 — Entrar en la app: cuenta local, subida y fusión

- [ ] 4.1 Test (falla primero): `tests/ui/acceso-primera-entrada.spec.ts` — `localStorage` sembrado con `progreso-local-real.json` (sin marcador), cuenta vacía en la API simulada, `/#auth=tok`: se anotan antes y después las cifras visibles de Panel, Plan (semana y día), Gramática, Vocabulario, Mis palabras, Errores, Simulacro y Writing → iguales; el `data` del `PUT` en JSON canónico es el local canónico sin `ai`/`theme`, con solo claves opcionales conocidas de más; `ruta-b1b2-v1` sigue; `ruta-b1b2-v1-copia` existe hasta el 200 y luego no; marcador escrito. (AC-12, AC-14, AC-15)
  - Archivos: `tests/ui/acceso-primera-entrada.spec.ts`.
- [ ] 4.2 Implementar `src/scripts/arranque.ts` (enlace → sesión → `alinear` → `import("./main")`; adopción perezosa para tokens de antes; alinear tarde con recarga); `index.astro` importa `arranque.ts`; `main.ts` recibe el resultado del enlace; `sync.ts` quita la copia tras el primer `PUT` confirmado.
  - Archivos: `src/scripts/arranque.ts`, `src/pages/index.astro`, `src/scripts/main.ts`, `src/scripts/sync.ts`.
- [ ] 4.3 Test (falla primero): en `acceso-primera-entrada.spec.ts`, local real + cuenta con `progreso-cuenta-real.json` → el estado final es `mergeState(local, cuenta)` del módulo, nada de ninguno falta en las vistas y la app lo dice una vez ("He juntado el progreso de este navegador con el de tu cuenta"). (AC-13)
  - Archivos: `tests/ui/acceso-primera-entrada.spec.ts`.
- [ ] 4.4 Implementar el aviso de fusión (anunciado con `anunciar()`).
  - Archivos: `src/scripts/main.ts` o `src/scripts/sync.ts` (donde se detecte la fusión).
- [ ] 4.5 Test (falla primero): cuenta nueva sin progreso local → onboarding (ruta + diagnóstico); cuenta con progreso en el servidor que entra en un dispositivo vacío → sin onboarding (espera a la primera sincronización, tope 5 s; sin red decide con lo local). (AC-9)
  - Archivos: `tests/ui/acceso-primera-entrada.spec.ts`.
- [ ] 4.6 Implementar K-14 en el arranque.
  - Archivos: `src/scripts/main.ts`.
- [ ] 4.7 Test (falla primero): `tests/ui/salir-y-otra-cuenta.spec.ts` — A con progreso sale → landing, `ruta-b1b2-v1` intacto; A vuelve → igual, sin pedir nada más; B entra en el mismo dispositivo → no ve nada de A, `ruta-b1b2-v1@<idA>` es byte a byte lo de A, B ve lo suyo del servidor; A vuelve → lo suyo restaurado; una corrección de IA encolada por A no se lanza con B y aparece de nuevo con A; en Ajustes, B no ve los pendientes de A. (AC-20)
  - Archivos: `tests/ui/salir-y-otra-cuenta.spec.ts`.
- [ ] 4.8 Implementar: "Cerrar sesión" con `flush()` → logout → `salir()` → landing; campo `cuenta` en `Pendiente`, `vaciar()` y `pendientesCard` filtran por la cuenta activa; `encolar` etiqueta la cuenta.
  - Archivos: `src/scripts/views/account.ts`, `src/scripts/queue.ts`, `src/scripts/ai.ts`, `src/scripts/views/settings.ts`.
- [ ] 4.9 Test (falla primero): `tests/ui/acceso-relevo.spec.ts` — (a) diagnóstico en la landing y `/#auth=tok` en la misma pestaña → onboarding abierto en el paso 3 con ese resultado, sin preguntas, y el `PUT` lleva `tracks[ruta].diag` con esas respuestas; (b) enlace en otra pestaña del mismo contexto con la landing abierta → el resultado llega por el canal y la landing pasa sola a la app; (c) landing cerrada → onboarding normal; (d) la cuenta ya tenía diagnóstico de esa ruta → no se pisa y se dice. `ruta-muestra-diag` desaparece tras aplicarse. (AC-6b, AC-24)
  - Archivos: `tests/ui/acceso-relevo.spec.ts`.
- [ ] 4.10 Implementar el relevo: respuesta al canal y escucha de `storage` en la landing; petición al canal y `aplicarResultado` en la app; `onboarding.ts` acepta un resultado dado y empieza en el paso 3; el onboarding usa `diag-muestra.ts` (sin cambio de comportamiento en el camino normal: 1.1 lo fija). Va después de SEL fases 4–5 y C1 5.5 en `onboarding.ts`.
  - Archivos: `src/scripts/landing/diagnostico.ts`, `src/scripts/landing/main.ts`, `src/scripts/arranque.ts`, `src/scripts/views/onboarding.ts`.
- [ ] 4.11 [C] Punto de control: comandos completos; AC-6b, AC-9, AC-12 a AC-15, AC-20 y AC-24 comprobados; `/code-review` del diff de la fase y `/security-review` (sesión, almacenamiento, canal entre pestañas); anotar.

## Fase 5 — Sin conexión y sesión

- [ ] 5.1 Test (falla primero): `tests/ui/offline.spec.ts` — tras entrar una vez con red, sin red: abrir la app y recorrer los 18 módulos con una acción en cada uno, sin errores en consola; Writing, Speaking, Tutor y Errores dicen en su sitio que la IA necesita conexión (y encolan donde ya lo hacían). (AC-16)
  - Archivos: `tests/ui/offline.spec.ts`.
- [ ] 5.2 Implementar lo que 5.1 saque (se espera poco: que el arranque sin red no espere a nada). Si sale algo grande, se para y se anota.
  - Archivos: según el fallo; anotar en `progress.md`.
- [ ] 5.3 Test (falla primero): sin red, marcar un día, repasar tarjetas y añadir una palabra; volver la red → un `PUT` sin acción del estudiante con esos cambios. (AC-17)
  - Archivos: `tests/ui/offline.spec.ts`.
- [ ] 5.4 Test (falla primero): `tests/ui/sesion-caducada.spec.ts` — la API simulada responde 401 a sesión y progreso: la app sigue abierta, aviso persistente con "Entrar"; cambios guardados en local; la cola de IA no gasta intentos con el 401; reentrar con la misma cuenta → `PUT` con todo lo pendiente y el aviso desaparece. (AC-18)
  - Archivos: `tests/ui/sesion-caducada.spec.ts`.
- [ ] 5.5 Implementar: 401 en `refreshSession` quita el token sin echar (el marcador sigue); aviso en el lateral y en Cuenta; `sync.ts` con `not_authenticated` deja `dirty` y no reinicia la versión; `queue.ts` trata el 401 como falta de red.
  - Archivos: `src/scripts/api.ts`, `src/scripts/main.ts`, `src/scripts/sync.ts`, `src/scripts/queue.ts`, `src/scripts/views/account.ts`.
- [ ] 5.6 Test (falla primero): `tests/ui/dos-dispositivos.spec.ts` — dos contextos con la misma cuenta y una API simulada con versión: A sube; B, con versión vieja, cambia otra cosa → 409 → fusión → `PUT`; el estado final del servidor tiene los dos cambios; dos 409 seguidos → se reintenta en el ciclo siguiente sin perder nada. (AC-19)
  - Archivos: `tests/ui/dos-dispositivos.spec.ts`.
- [ ] 5.7 Implementar lo que 5.6 saque (reintento acotado tras el segundo 409).
  - Archivos: `src/scripts/sync.ts`.
- [ ] 5.8 [C] Punto de control: comandos completos; AC-16 a AC-19 comprobados; anotar.

## Fase 6 — Fuera la clave propia (AC-22)

- [ ] 6.1 **[DEC]** El dueño decide si la clave ya guardada se vacía una vez con aviso o solo se ignora (plan, "Decisiones para el dueño" 3). Anotar en `progress.md`.
- [ ] 6.2 Test (falla primero): `tests/ui/sin-clave-propia.spec.ts` — Ajustes sin campo de clave ni "Obtener una clave"; con `ai.key` sembrado en el estado, una corrección de Writing sale solo hacia `/api/ai/chat`; ningún texto de la app dice "clave propia", "tu propia clave" ni "créditos de prueba"; Cuenta sin "Clave propia activa" ni "Esta copia no usa cuentas"; Tutor sin "con tu propia clave"; según 6.1, la clave guardada queda vacía con aviso o intacta.
  - Archivos: `tests/ui/sin-clave-propia.spec.ts`.
- [ ] 6.3 Implementar: `ai.ts` sin `usesOwnKey`, `ownKeyEndpoint`, la vía directa ni sus mensajes; `settings.ts` sin `ownKeyCard`; `account.ts` sin la tarjeta de clave, la rama sin cuentas, el formulario de entrar y la tabla "sin cuenta / con cuenta"; `Tutor.astro`; chip de cuota de `main.ts`. Va después de SEL 4.6 y TUT 4.x en `ai.ts` (ORDEN).
  - Archivos: `src/scripts/ai.ts`, `src/scripts/views/settings.ts`, `src/scripts/views/account.ts`, `src/components/views/Tutor.astro`, `src/scripts/main.ts`.
- [ ] 6.4 [C] Punto de control: comandos completos; AC-21 y AC-22 comprobados de punta a punta (cliente + contrato de la fase 2); anotar.

## Fase 7 — Bienvenida sin modelo (AC-24, AC-25)

- [ ] 7.1 Test (falla primero): `tests/ui/bienvenida.spec.ts` — dos diagnósticos distintos (uno desde la landing, otro desde el onboarding) → el paso 3 muestra nivel por área, tres puntos y qué toca hoy (día y bloques del plan) distintos y coherentes con `bienvenida.ts`; el `h1` recibe el foco y el texto se anuncia; 320 px sin scroll horizontal.
  - Archivos: `tests/ui/bienvenida.spec.ts`.
- [ ] 7.2 Implementar el paso 3 del onboarding con `bienvenida.ts`.
  - Archivos: `src/scripts/views/onboarding.ts`.
- [ ] 7.3 [C] Punto de control: comandos completos; AC-24 y AC-25 (rama sin modelo) comprobados; `design:design-critique` y `design:accessibility-review` sobre onboarding y avisos nuevos; anotar.

## Fase 8 — "Mi seguimiento" y bienvenida con modelo (bloqueada por el harness)

No empieza hasta que se cumplan 8.1 y 8.2.

- [ ] 8.1 **[DEC]** El dueño decide dónde vive "Mi seguimiento" (vista nueva en "Atajos" o sección de Cuenta) y si el harness tiene un tipo de ejecución `bienvenida` (plan, "Decisiones para el dueño" 4 y 5). Si es vista nueva: enmienda del non-goal en `specs/rediseno-limpio/spec.md` y del punto de montaje en `specs/harness-alumno/plan.md`, por sus dueños.
- [ ] 8.2 Dependencia: `harness-alumno` con perfil, propuestas, exportación, `eventOutbox` e isla hechos (sus fases 1–10), y con lo que pide esta feature: evolución semanal por destreza y origen de cada dato en el perfil; `ruta-b1b2-eventos` y la clave del aviso de privacidad añadidas a `CLAVES_POR_CUENTA`; `StartingPoint` leyendo las respuestas de `diag` por área.
- [ ] 8.3 Test (falla primero): `tests/ui/seguimiento.spec.ts` con `/api/learner/*` simulado — nivel por destreza y su evolución semana a semana, puntos fuertes y débiles, errores que se repiten y propuestas pendientes, cada dato con de qué ejercicios sale; estados de carga, vacío ("aún no hay datos suficientes"), error y sin conexión. (AC-26)
  - Archivos: `tests/ui/seguimiento.spec.ts`.
- [ ] 8.4 Implementar el montaje de la isla del harness en el sitio decidido en 8.1.
  - Archivos: según 8.1 (p. ej. `src/components/views/Seguimiento.astro`, `src/scripts/nav.ts`, `src/pages/index.astro`).
- [ ] 8.5 Test (falla primero): un ejercicio hecho con red y otro sin red aparecen en Mi seguimiento en la siguiente visita a la vista (tras sincronizar), sin acción manual; con otra cuenta en el dispositivo no se mezclan. (AC-27)
  - Archivos: `tests/ui/seguimiento.spec.ts`.
- [ ] 8.6 Implementar lo que falte en el lado de esta feature (invalidar la consulta al volver a la vista; vaciar el `eventOutbox` tras reentrar).
  - Archivos: según el fallo.
- [ ] 8.7 Test (falla primero) e implementar: "Descargar mi seguimiento" llama a `GET /api/learner/exportar` y guarda el archivo; error en texto si falla. (AC-28)
  - Archivos: `tests/ui/seguimiento.spec.ts`, el componente del punto de montaje.
- [ ] 8.8 Test (falla primero) e implementar: con harness activo, la bienvenida del paso 3 pide la ejecución `bienvenida`; respuesta válida → texto del modelo con los mismos datos; error, límite, harness apagado o sin red → la plantilla de la fase 7 sin pantalla rota. (AC-25)
  - Archivos: `tests/ui/bienvenida.spec.ts`, `src/scripts/views/onboarding.ts`.
- [ ] 8.9 [C] Punto de control: comandos completos; AC-25 a AC-28 comprobados; revisiones de diseño y accesibilidad de la vista; anotar.

## Cierre

- [ ] 9.1 Smoke real con el stack local (Docker, Mailpit, IA simulada): landing → correo → enlace del buzón → onboarding o fusión → estudiar sin red → volver → salir. Sin llamadas reales a DeepSeek.
- [ ] 9.2 Criterios AC-1 a AC-28 revisados uno a uno en `progress.md`, con los "Cambios respecto al spec" del plan; `/code-review` y `/simplify` del diff completo; `/security-review` (auth, almacenamiento, IA).
- [ ] 9.3 [C] Punto de control final: `npm test`, `npm run test:plan`, `npm run check`, `npm run build`, `npm run test:ui`, contrato contra Node (y Laravel si existe); `master` intacto.
- [ ] 9.4 **[AUT]** Antes de publicar: comprobar en producción `ACCOUNTS_ENABLED` y el proveedor de correo real (sin ellos nadie puede entrar), y OK del dueño para mergear en `master` (despliega en Netlify).

## Resumen de dependencias externas

| Tarea | Necesita | De |
|---|---|---|
| 3.x en adelante | Suite Playwright | `rediseno-limpio` (0.2) |
| 3.5 | Maqueta con la landing aprobada | `rediseno-limpio` (0.4) |
| 1.9–1.10 | `merge.ts` extraído | `ruta-b2-c1` 2.4–2.6 (0.3) |
| 3.16–3.17 | `sw.js` / precache tras su fase 3 | `ruta-b2-c1` fase 3 |
| 4.10, 7.2 | `onboarding.ts` libre | `selector-de-ruta` fases 4–5, `ruta-b2-c1` 5.5 |
| 6.3 | `ai.ts` libre | `selector-de-ruta` 4.6, `tutor-contextual` 4.x |
| 2.x | Antes de lote c (o incluirlo) | `backend-separado` |
| 8.x | Perfil, exportación, eventos, isla y lo pedido en 8.2 | `harness-alumno` |
