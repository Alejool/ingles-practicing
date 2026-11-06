# Landing y acceso con cuenta — Plan técnico

Fuente funcional: `specs/landing-y-acceso/spec.md` (AC-1 a AC-28, sin preguntas abiertas). Constitución: principio 8 enmendado (landing pública, cuenta para la app, offline tras entrar) y principio 6 (lo guardado no cambia de forma). Backend: la API Node actual hoy y Laravel después, con el mismo contrato (`tests/contract/`, `specs/backend-separado/plan.md`).

Hechos del código que condicionan el plan (leídos el 2026-11-05):

| Hecho | Dónde | Consecuencia |
|---|---|---|
| `S = load()` se ejecuta al importar `state.ts`; una sola clave `ruta-b1b2-v1` | `src/scripts/state.ts:11,151` | Cambiar de cuenta en el dispositivo tiene que ocurrir **antes** de importar `state.ts`. |
| El enlace mágico vuelve siempre a `<base>/#auth=<token>` (302 de `auth-verify`) | `netlify/functions/auth-verify.mts`, contrato `auth-verify` | La app tiene que seguir en la raíz para no tocar un contrato congelado. |
| `pullAndMerge()` ya baja, funde y sube; sin datos remotos sube lo local | `src/scripts/sync.ts:241` | AC-12 ya casi existe; falta decidir **qué** local es de qué cuenta. |
| `mergeTrack` no funde `known`, `seen` ni `onboarded`; en `gram` elige la unidad entera con más claves; en `writing.chk` gana lo local aunque sea `false` | `src/scripts/sync.ts:62-193` | Hoy hay pérdidas reales en la fusión: AC-13 las cierra. |
| `merge.ts` se extrae de `sync.ts` en `ruta-b2-c1` (C1 2.4–2.6) con test de caracterización | `specs/ruta-b2-c1/tasks.md` | Esta feature extiende `merge.ts`, no lo crea. |
| `headers()` escribe `ruta-b1b2-device` en la primera petición | `src/scripts/api.ts:47-78` | La landing necesita peticiones sin identificador de dispositivo para no guardar nada (AC-4). |
| `pulse.ts`, `library.ts`, `queue.ts`, `progress.ts`, `track.ts` importan `state.ts` o escriben en el navegador | imports de `src/scripts/` | La landing no puede importar nada de eso: entrada y bundle propios. |
| El contenido de cada ruta está en archivos con exportaciones sueltas (`DIAG`, `DECKS`, `LISTENING`, `TRANS`) | `src/data/{a2b1,b1b2}/*.ts` | La muestra puede importar solo esos archivos (bundle pequeño, precacheable) sin reescribir contenido. |
| El onboarding ya elige 10 preguntas (`muestra()`) y guarda `{answers, done:false, score}` | `src/scripts/views/onboarding.ts:44,258` | El diagnóstico de la landing usa la misma selección y la misma forma: lo que llega a la cuenta es indistinguible del onboarding. |
| `ai.ts` tiene una vía directa a DeepSeek con la clave del navegador | `src/scripts/ai.ts:35-48,172-190`, `views/settings.ts:106` | AC-22 la quita. |
| `ai-chat.mts` acepta peticiones sin sesión (cupo anónimo `anon_limit`) | `netlify/functions/ai-chat.mts:33` | AC-21: `requireUser` antes de leer el cuerpo. La API Node está congelada desde BES 1.13: el cambio va con su contrato y su versión en Laravel. |
| No hay suite de interfaz; `npm test` es `node:test` sobre `tests/*.test.mts` | `package.json` | Lo puro se prueba con `node:test`; los flujos de navegador con la suite Playwright que monta `rediseno-limpio` (se depende de ella, no se duplica). |

## Technical Approach

1. **Dos páginas.** La app sigue en `/` (`src/pages/index.astro`) y la landing es una página nueva, `/bienvenida/` (`src/pages/bienvenida.astro`), con su propio script de entrada. Un guardián en línea en el `<head>` de la app manda a la landing a quien no tiene sesión **antes** de cargar nada de la app. La landing no importa ningún módulo que lea o escriba el estado.
2. **Muestra sin estado.** Las cuatro actividades de la landing viven en `src/scripts/landing/` y solo usan `dom.ts`, `voice.ts`, `diag-muestra.ts` y un módulo de datos que importa piezas sueltas de `src/data/`. Todo vive en memoria; la única excepción es el resultado del diagnóstico, en `sessionStorage`.
3. **Cuenta local.** Un módulo puro, `cuenta-local.ts`, decide al entrar qué progreso local pertenece a qué cuenta: **adoptar** (progreso sin dueño, el de antes de esta feature), **igual** (es la misma cuenta) o **cambiar** (otra cuenta: lo de la anterior se archiva en claves nuevas y no se mezcla). Corre en `arranque.ts`, antes de importar `main.ts`.
4. **Subida y fusión.** Se reutiliza `pullAndMerge()`; `merge.ts` (de C1) se completa para que la fusión sea de verdad sin pérdida (AC-13). Antes de la primera fusión se guarda una copia literal del progreso local.
5. **Offline y sesión caducada.** Entrar deja un marcador de cuenta en el dispositivo; el guardián deja pasar con token **o** con marcador activo, así que una sesión que caduca sin red no echa a nadie. Al volver la red se pide entrar otra vez y se sincroniza lo pendiente.
6. **IA solo con cuenta.** El servidor exige sesión en `/api/ai/chat` (Node ahora, Laravel lote c); el cliente pierde la vía de clave propia.
7. **Bienvenida y seguimiento.** Antes del harness sale la bienvenida determinista (nivel por área, tres puntos, qué toca hoy) calculada en el cliente con el diagnóstico y el plan. "Mi seguimiento", la exportación y la bienvenida redactada por el modelo dependen del harness y quedan como fase bloqueada.

## Decisiones

| # | Decisión | Alternativa descartada | Motivo |
|---|---|---|---|
| K-1 | App en `/`, landing en `/bienvenida/` | Landing en `/` y app en `/app/` | El enlace mágico vuelve a `/#auth=` (contrato congelado), la PWA instalada arranca en `./?source=pwa`, el respaldo offline del SW es `./index.html` y los atajos del manifiesto son `./#vocab`: todo sigue igual. nginx de `docker/` y el shell del rediseño no cambian. Coste: un visitante que llega a la raíz pasa por una redirección en línea (antes de cargar la app). |
| K-2 | Guardián en línea (`<script is:inline>`) en el `<head>` de la app | Comprobar en `main.ts` | Se ejecuta antes de descargar la app: no hay parpadeo de vistas de estudio ni peticiones de la app sin sesión. |
| K-3 | El guardián es de experiencia, no de seguridad | Proteger estáticos en el servidor | El contenido de estudio es público en el bundle; lo que cuesta (IA) y lo personal (progreso) ya lo protege el servidor. |
| K-4 | Sesión en el cliente = token **o** marcador de cuenta activo | Solo token | AC-18: con el token caducado sin red, se sigue estudiando. |
| K-5 | Resultado del diagnóstico en `sessionStorage` + `BroadcastChannel` | Memoria; `localStorage` | Ver "Relevo del diagnóstico". |
| K-6 | Cambio de cuenta = archivar en claves nuevas `…@<id>` | Una clave por cuenta desde el principio | Principio 6: `ruta-b1b2-v1` conserva nombre y forma y sigue siendo el progreso activo; el código viejo (pestaña abierta antes del despliegue) sigue funcionando. |
| K-7 | Id de cuenta en el dispositivo = 16 hex de SHA-256 del correo normalizado | El correo en claro | No deja el correo en `localStorage`; estable entre dispositivos. |
| K-8 | La fusión cubre lo que hoy se pierde y usa "más reciente" por aproximación (tabla abajo) | Añadir marca de tiempo a cada ítem | Sin cambiar la forma (principio 6) y sin tocar todas las vistas que escriben ítems. Ver "Decisiones para el dueño". |
| K-9 | Copia literal `ruta-b1b2-v1-copia` antes de la primera fusión, se quita tras la confirmación del servidor | Sin copia | AC-14 de forma literal y red de seguridad ante un fallo de la fusión. |
| K-10 | La landing pregunta por las cuentas y pide el enlace **sin** `X-Device-Id` | Usar `headers()` tal cual | AC-4: entrar en la landing no escribe nada en el navegador. Los endpoints de auth no necesitan dispositivo. |
| K-11 | La muestra importa piezas sueltas de `src/data/` en un módulo propio, precacheado con la landing | Cargar la ruta entera con `cargarTrack()` | AC-7 sin descargar la ruta completa (~200 KB) en la instalación; contenido real sin reescribir (principio 7). |
| K-12 | `/api/ai/chat`: preflight → 405 → sesión (401/403) → cuerpo → resto | Sesión después de validar el cuerpo | Sin sesión no se lee el cuerpo ni se reserva nada ni se llama al modelo (AC-21). Mismo patrón que `/api/progress`, pero el 405 sigue primero para no romper los casos de método del contrato. |
| K-13 | El cupo anónimo deja de usarse en el chat; `_quota.mts`/`QuotaPolicy` no se tocan | Borrar la rama anónima | `/api/quota` y `/api/auth/session` siguen respondiendo igual (contrato congelado); limpiar la rama queda para la retirada de Node (BES fase 6). |
| K-14 | La decisión de mostrar el onboarding espera a la primera sincronización cuando hay sesión y red (tope 5 s) | Decidir con lo local | Si no, una cuenta con progreso en el servidor que entra en un dispositivo vacío ve el onboarding (AC-9 dice "sin progreso previo"). |
| K-15 | Bienvenida sin modelo en esta feature; con modelo cuando exista el harness | Esperar al harness para todo | La información de AC-25 se calcula sin IA; AC-25 ya prevé ese camino. |

## Arquitectura

### Páginas y guardián

```
src/pages/index.astro        app (sin cambios de estructura) + guardián en línea en el <head> + import de arranque.ts
src/pages/bienvenida.astro   landing: explicación, muestra, entrada. Script: src/scripts/landing/main.ts
src/layouts/Base.astro       prop nueva `cartelCarga` (por defecto true): la landing no enseña "Preparando tu contenido…"
```

Guardián (en línea, sin imports, consciente de `BASE_URL`):

```
hash = location.hash
si hash es "#auth=expired" o "#auth=error"      → replace(base + "bienvenida/#acceso=" + caducado|error)
si hash empieza por "#auth="                    → seguir (lo consume arranque.ts)
token  = localStorage["ruta-b1b2-session"]
cuenta = JSON de localStorage["ruta-b1b2-cuenta"] (si no parsea: null)
si token o (cuenta y cuenta.salida == null)     → seguir
si no                                           → replace(base + "bienvenida/")
```

Cualquier `#plan`, `#cuenta`, `#ajustes`… sin sesión cae en la última rama (AC-1). En la landing, el script hace lo simétrico: con token presente pasa a la app. El acceso a `localStorage` va en `try` (modo privado sin almacenamiento = sin sesión).

### Arranque de la app

`src/scripts/arranque.ts` (nuevo) sustituye a `import "../scripts/main"` en `index.astro`:

1. `consumeAuthHash()` (ya existe en `api.ts`, que no importa `state.ts`).
2. Si trae token nuevo: `GET /api/auth/session` → correo → `idDeCuenta()` → `alinear()` (abajo). Si la red falla aquí, se arranca igual y se alinea en el primer `refreshSession` con éxito (caso raro: ver "alinear tarde").
3. Si no trae token pero hay token sin marcador (cuentas de antes de esta feature): se arranca y se **adopta** al primer `refreshSession` con éxito (no hace falta recargar: el progreso sin dueño ya es el activo).
4. `await import("./main")` con el resultado del enlace como argumento (`main.ts` deja de llamar a `consumeAuthHash`).

**Alinear tarde**: si al saber el correo resulta que el marcador es de otra cuenta (solo pasa si la red cayó entre el enlace y la sesión), se hace el cambio y `location.reload()`.

### Módulos nuevos

| Archivo | Qué es | Importa | Test |
|---|---|---|---|
| `src/scripts/diag-muestra.ts` | `muestraDiag(items, n=10)` (la selección del onboarding), `puntuar(items, respuestas)` → `{aciertos, pct, porArea[{area, ok, n, banda}], semana, dia}`, `aplicarResultado(estado, resultado)` | solo tipos | `tests/diag-muestra.test.mts` |
| `src/scripts/relevo-diag.ts` | Validar y serializar el resultado; mensajes del canal; adaptadores finos de `sessionStorage` y `BroadcastChannel` inyectables | `diag-muestra.ts`, tipos | `tests/relevo-diag.test.mts` |
| `src/scripts/cuenta-local.ts` | `idDeCuenta`, `alinear`, `salir`, `puedeEntrar`, `CLAVES_POR_CUENTA`; trabaja sobre un `Storage` inyectado | nada | `tests/cuenta-local.test.mts` |
| `src/scripts/bienvenida.ts` | Mensaje determinista: nivel por área, tres puntos, qué toca hoy | tipos | `tests/bienvenida.test.mts` |
| `src/scripts/arranque.ts` | Orden de arranque (arriba) | `api.ts`, `cuenta-local.ts`, `relevo-diag.ts` | navegador |
| `src/scripts/landing/main.ts` | Entrada de la landing | ver abajo | navegador + `tests/landing-aislada.test.mts` |
| `src/scripts/landing/{diagnostico,tarjetas,escucha,uoe,entrada}.ts` | Las cuatro actividades y el formulario | `dom.ts`, `voice.ts`, `diag-muestra.ts`, `relevo-diag.ts`, `api.ts` (solo `entrada.ts`) | navegador |
| `src/scripts/landing/muestra-datos.ts` | Una pieza real de cada tipo por ruta de `TRACK_META` | `src/data/<ruta>/{diagnostic,decks,listening,uoe}.ts`, `src/data/tracks.ts` (solo `TRACK_META`) | `tests/muestra-datos.test.mts` |

### Archivos existentes que cambian

| Archivo | Cambio | ACs |
|---|---|---|
| `src/pages/index.astro` | guardián en línea; `arranque.ts` en vez de `main.ts` | 1, 18 |
| `src/layouts/Base.astro` | prop `cartelCarga` | 2 |
| `src/scripts/main.ts` | recibe el resultado del enlace; onboarding tras la primera sincronización (K-14); aviso de sesión caducada; chip de cuota sin rama "sin servidor / clave propia" | 9, 18, 22 |
| `src/scripts/api.ts` | opción `{ dispositivo: false }` en `get`/`send`/`requestLoginLink`; un 401 en `refreshSession` borra el token pero no saca de la app | 10, 18 |
| `src/scripts/merge.ts` (de C1) | reglas de AC-13 | 13, 19 |
| `src/scripts/sync.ts` | quitar la copia tras confirmar; `not_authenticated` deja `dirty` y no reinicia la versión | 14, 17, 18 |
| `src/scripts/queue.ts` | campo opcional `cuenta` en `Pendiente`; vaciar solo los de la cuenta activa; un 401 espera como la falta de red | 18, 20 |
| `src/scripts/ai.ts` | fuera la vía de clave propia y sus mensajes; `encolar` etiqueta la cuenta | 21, 22 |
| `src/scripts/views/settings.ts` | fuera `ownKeyCard`; `pendientesCard` filtra por cuenta | 20, 22 |
| `src/scripts/views/account.ts` | fuera "clave propia activa", la rama "esta copia no usa cuentas", el formulario de entrar (vive en la landing) y la tabla "sin cuenta / con cuenta"; "Cerrar sesión" → `salir()` y a la landing | 20, 22 |
| `src/scripts/views/onboarding.ts` | usa `diag-muestra.ts`; puede empezar en el paso 3 con un resultado dado; el paso 3 pinta la bienvenida | 6b, 9, 25 |
| `src/components/views/Tutor.astro` | texto "con tu propia clave" | 22 |
| `public/sw.js`, `scripts/precache.mts` | landing en el esqueleto; respaldo de navegación por página | 7, 16 |
| `public/manifest.webmanifest` | sin cambios (K-1) | — |
| `netlify/functions/ai-chat.mts` + `tests/contract/ai-chat.test.mts` | sesión obligatoria (K-12) | 21 |

## Landing

### Contenido y diseño (AC-2, AC-23)
- Una pantalla de explicación con texto real: las rutas de `TRACK_META` (A2 → B1, B1 → B2; B2 → C1 aparece sola cuando `ruta-b2-c1` la publique), plan de 24 semanas, 45 min/día, qué se practica (gramática, vocabulario con repetición espaciada, Use of English, escucha, lectura, writing y speaking con corrección).
- **Una** acción con relleno naranja: "Entrar con tu correo" (lleva al formulario y enfoca el campo). Los "Entrar" que aparecen tras cada actividad (AC-6) son secundarios (borde) y hacen lo mismo. "Seguir probando" es discreto.
- Tokens, Instrument Sans, claro/oscuro, foco visible, teclado, AA, 320–375 px sin scroll horizontal: reglas de `rediseno-limpio`. La maqueta de la landing tiene que estar aprobada antes de maquetar (lo exige el propio rediseño).
- Si hay progreso en `ruta-b1b2-v1` (estudiante de antes, o alguien que salió), la landing lo dice en una línea: "Tu progreso sigue en este navegador. Entra con tu correo y pasa a tu cuenta." Solo lee la clave.

### Muestra (AC-3)
`muestra-datos.ts` elige, por cada ruta, sin editar nada de `src/data/`:

| Tipo | Pieza | Corrección |
|---|---|---|
| Diagnóstico | `muestraDiag(DIAG, 10)` — las mismas diez del onboarding | Al final, por área (como el diagnóstico de la app); repaso con la explicación `exp` |
| Tarjetas | Las 8 primeras tarjetas del primer mazo de `DECKS` | "Lo sé / No lo sé" con la traducción al girar |
| Escucha | El primer `LISTENING` | Protocolo de tres pases con `speechSynthesis` (`voice.ts`); preguntas tras el tercero, corrección inmediata. Sin voz inglesa: transcripción visible y aviso |
| Use of English | La primera `TRANS` | Corrección inmediata con las respuestas aceptadas `a` (misma normalización que `uoe.ts`, `norm` de `dom.ts`) |

La ruta de la muestra la elige el visitante en la propia landing (por defecto B1 → B2, como `DEF.track`).

### Sin persistencia (AC-4, AC-5) y cómo se prueba
Por construcción:
- Ningún archivo de `src/scripts/landing/` importa `state`, `sync`, `queue`, `ai`, `pulse`, `library`, `progress`, `track`, `nav` ni vistas de la app. Lo comprueba `tests/landing-aislada.test.mts` leyendo los imports (directos y transitivos dentro de `src/scripts/`), como el `AppendOnlyTest` del harness.
- `entrada.ts` usa `api.ts` con `{ dispositivo: false }`: ni `X-Device-Id` ni `ruta-b1b2-device`.
- La única escritura es `sessionStorage["ruta-muestra-diag"]` al terminar el diagnóstico.

Por comportamiento (Playwright, `tests/ui/landing-muestra.spec.ts`):
1. Contexto limpio; se abre `/bienvenida/`; se toma una foto de `localStorage`, `sessionStorage`, nombres de bases de IndexedDB (`indexedDB.databases()`) y cookies.
2. Se juegan las cuatro actividades enteras.
3. Foto otra vez: idéntica salvo `sessionStorage["ruta-muestra-diag"]`. Cache Storage queda fuera a propósito (son archivos del sitio que guarda el service worker, no "lo hecho").
4. Recarga: tarjetas, escucha y UoE vuelven a empezar; el diagnóstico muestra su resultado (la excepción de AC-6b) con la nota "se pierde al cerrar la pestaña".
5. Durante todo el recorrido, `page.on("request")`: cero peticiones a `/api/ai/`, `/api/pulse`, `/api/progress`, `/api/readings`, `/api/harness/`, `/api/learner/` ni a hosts de DeepSeek. Las únicas llamadas permitidas son `GET /api/auth/session` y `POST /api/auth/request` (y solo si se usa el formulario).

### Entrada (AC-8, AC-10, AC-11)
`entrada.ts`:
- Al cargar, `GET /api/auth/session` sin dispositivo: `accounts:false` → aviso "La entrada no está disponible ahora" y formulario desactivado (AC-11). Respuesta HTML/404/405 (copia sin API) → el mismo aviso. Sin red → "Sin conexión: para entrar necesitas internet. Puedes seguir probando."
- Enviar: validación en el cliente (la misma expresión que hoy en `account.ts`), `POST /api/auth/request` sin dispositivo. Errores en texto bajo el campo, con `aria-invalid`/`aria-describedby` y anuncio, **sin vaciar el campo**: `bad_email` 422, `mail_failed` 502, `too_many_links` 429, `accounts_off` 404, red. Éxito: "Te he mandado un enlace a … Ábrelo en este dispositivo" (y el buzón local en desarrollo, como hoy).
- Llegada desde el guardián con `#acceso=caducado` → "Ese enlace caducó o ya se usó. Pide otro."; `#acceso=error` → "No se pudo completar la entrada. Inténtalo otra vez."
- Mismo flujo para cuenta nueva y existente: el servidor ya hace `upsert` en `auth-verify`.

## Relevo del diagnóstico (AC-6b)

**Dónde se guarda: `sessionStorage`**, clave `ruta-muestra-diag`:

```json
{ "v": 1, "track": "b1b2", "respuestas": { "<id de DiagItem>": 2, "…": 0 }, "hecho": "2026-11-05T10:00:00Z" }
```

Solo respuestas: la nota y las áreas se recalculan con `puntuar()` contra el contenido real al aplicarlo (no se confía en lo guardado). `relevo-diag.ts` rechaza un valor con otra versión, una ruta fuera de `TRACK_META`, ids que no están en las diez de esa ruta o menos de diez respuestas.

Por qué `sessionStorage` y no memoria ni `localStorage`:
- **Memoria no basta.** Si el enlace se abre en la misma pestaña (pegarlo en la barra, buzón local de desarrollo, algunos clientes de correo de escritorio) hay una navegación de `/bienvenida/` a `/#auth=…`: la memoria se pierde.
- **`localStorage` incumple el spec.** Sobrevive a cerrar la pestaña ("si cierra la pestaña, el resultado se pierde") y queda en disco y visible para otras pestañas.
- **`sessionStorage`** sobrevive a recargas y navegaciones de la misma pestaña, muere con ella y no la ven otras pestañas.

**Enlace abierto en otra pestaña** (lo normal desde el correo): la pestaña nueva no ve el `sessionStorage` de la landing. Tras entrar, `arranque.ts` pregunta por un `BroadcastChannel("ruta-relevo")` (`{tipo:"pide"}`, espera 800 ms); la landing, si sigue abierta, responde `{tipo:"da", resultado}` y borra su copia. Además la landing escucha el evento `storage` de `ruta-b1b2-session`: cuando aparece el token, pasa sola a la app. Si la landing se cerró, no hay respuesta y el onboarding pide el diagnóstico (comportamiento de AC-6b: se perdió).

**Aplicarlo** (en la app, tras `alinear()` y con la ruta cargada): `aplicarResultado(S, resultado)`:
- Si `tracks[ruta].diag` no tiene respuestas ni está hecho: escribe `diag = {answers, done:false, score}`, `stats.diag = {ok, n}` y `current = dia` (exactamente lo que hace hoy el paso 3 del onboarding), pone `S.track = ruta` y abre el onboarding en el paso 3 (bienvenida) sin repetir preguntas.
- Si ya hay diagnóstico de esa ruta en la cuenta: no se pisa; aviso "Tu cuenta ya tenía un diagnóstico de esta ruta: se queda ese".
- Después se borra `ruta-muestra-diag`. La sincronización normal lo sube a la cuenta.

Límite conocido: si el correo abre el enlace en otro navegador (navegador interno de una app de correo en el móvil), no hay relevo posible sin pasar por el servidor, y el spec prohíbe guardar la muestra en el servidor. Ver "Decisiones para el dueño".

## Cuenta local (AC-12, AC-14, AC-20)

### Claves (todas en `localStorage`; las existentes no cambian de nombre ni de forma)

| Clave | Existe | Por cuenta | Qué es |
|---|---|---|---|
| `ruta-b1b2-v1` | sí | sí (la de la cuenta activa) | Progreso activo. Forma intacta. |
| `ruta-b1b2-sync-version` | sí | sí | Versión del servidor conocida. |
| `ruta-b1b2-session` | sí | — | Token de sesión. |
| `ruta-b1b2-device`, pulso, caché de biblioteca | sí | no (del aparato) | Sin cambios. |
| `ruta-b1b2-cuenta` | **nueva** | — | `{"v":1,"id":"<16 hex>","salida":null \| "<ISO>"}`: de quién es `ruta-b1b2-v1` y si salió. |
| `ruta-b1b2-v1@<id>` | **nueva** | sí | Progreso archivado de otra cuenta, copia literal. |
| `ruta-b1b2-sync-version@<id>` | **nueva** | sí | Su versión. |
| `ruta-b1b2-v1-copia` | **nueva** | — | Copia literal del progreso sin dueño antes de la primera fusión; se quita al confirmar el servidor. |
| `ruta-b1b2-eventos`, aviso de privacidad (harness) | futuras (HAR) | sí | Se añaden a `CLAVES_POR_CUENTA` cuando existan. |

IndexedDB `ruta-b1b2-cola`: campo nuevo opcional `cuenta?: string` en `Pendiente`. Sin cambio de versión de la base (los objetos sin el campo siguen valiendo).

### `alinear(storage, id)`

```
marcador = leer ruta-b1b2-cuenta
sin marcador                → ADOPTAR: escribir ruta-b1b2-v1-copia (si hay v1), escribir marcador {id, salida:null},
                              etiquetar con id los pendientes de la cola sin cuenta
marcador.id == id           → IGUAL: marcador.salida = null
marcador.id != id           → CAMBIAR:
                                1. para cada clave de CLAVES_POR_CUENTA con valor: escribir <clave>@<marcador.id>, releer, comparar;
                                   si algo no coincide → abortar sin tocar nada y avisar (no se pierde nada)
                                2. tema del aparato: se lee de v1 (S.theme no viaja al servidor)
                                3. para cada clave: si existe <clave>@<id> → copiarla a <clave>; si no → quitar <clave>
                                   (su copia archivada ya está escrita y verificada)
                                4. reponer el tema en el v1 nuevo (si hay v1); marcador = {id, salida:null}
```

`salir()`: `flush()` si hay red → `POST /api/auth/session` (logout) → quitar token → `marcador.salida = ahora` → `location.replace(base + "bienvenida/")`. No borra progreso (AC-20). Volver a entrar con la misma cuenta = IGUAL + `pullAndMerge()`; con otra = CAMBIAR.

Garantía (test): ninguna rama quita una clave de progreso sin haber escrito y releído antes su copia; con un `Storage` que falla al escribir, `alinear` no cambia nada.

## Primera subida y fusión (AC-12 a AC-15, AC-19)

Flujo al entrar (ya existente, con la cuenta alineada antes): `pullAndMerge()` → `GET /api/progress` →
- `data: null` (cuenta vacía, AC-12): sube `payload(S)` tal cual.
- con datos (AC-13): `replaceState(mergeState(S, remoto))`, y la app lo dice una vez ("He juntado el progreso de este navegador con el de tu cuenta").
- `PUT` con la versión; 409 `version_conflict` → fusión con `server.data` y reintento (ya existe; AC-19). Un segundo 409 deja `dirty` y reintenta en el siguiente ciclo; nunca descarta lo local.
- Tras el primer `200`: se quita `ruta-b1b2-v1-copia` (AC-14).

**AC-15, forma y "byte a byte".** El servidor guarda `jsonb`, que no conserva el orden de claves ni los espacios: la igualdad literal de bytes no se puede comprobar en la base. El test compara **JSON canónico** (claves ordenadas): `canónico(data subido) == canónico(local guardado)` quitando `ai` y `theme` (no viajan desde siempre: clave de API y preferencia del aparato, `sync.ts:56`), y las únicas claves de más son las opcionales conocidas que añade `migrate()` (campos de `blankTrack()` ausentes, `onboarded`). Ninguna clave se renombra ni cambia de tipo.

### Reglas de fusión (AC-13)

"Unión" = ningún elemento de ninguno de los dos lados desaparece. "Más reciente" sin marca de tiempo: donde el dato es monótono, lo más avanzado **es** lo más reciente; donde no lo es, se usa el contador de uso del propio ítem; a igualdad, gana lo local.

| Parte | Regla | Hoy |
|---|---|---|
| `tracks` | unión de rutas (C1 2.6), cada una con las reglas de abajo | igual tras C1 |
| `days`, `steps` | unión de marcas (OR) | igual |
| `known` | unión de marcas (OR) | **nuevo**: hoy se pierde lo remoto |
| `current` | máximo (punto más avanzado del plan) | igual |
| `counters`, `read` | máximo por clave | igual |
| `stats` | máximo por área (son agregados: sumar duplicaría) | igual |
| `srs` | unión de tarjetas; misma tarjeta: mayor `seen` si ambos lo tienen (la que más repasos lleva es la más reciente, aunque haya bajado de caja); si no, la regla actual (caja, luego `due`) | **cambia** en el caso con `seen` |
| `gram` | unión por unidad **y por pregunta**; misma pregunta: la acertada; a igualdad, la local | **cambia**: hoy gana la unidad entera con más claves |
| `uoe` | unión; misma clave: la acertada | igual |
| `mock` | `best`/`current` máximo; `history` unión sin duplicar | igual |
| `quiz` | `best` máximo; `history` unión, tope 40 (el mismo tope que aplica la app al guardar) | igual |
| `writing` | unión; mismo texto: el más largo; `chk` OR por índice | **cambia** `chk`: hoy un `false` local pisa un `true` remoto |
| `mine` | unión por palabra; misma palabra: la regla actual (la más exigente) | igual |
| `gen` | unión por `id`, orden por `made`, tope 40 (el de la app) | igual |
| `diag` | si solo uno está hecho, ese; los dos, el de mayor `pct` | igual |
| `errors` | unión por `id` | igual |
| `seen` (logros) | unión | **nuevo**: hoy se pierde lo remoto |
| `streak` | unión de días; `last` máximo | igual |
| `onboarded` | OR | **nuevo** |
| `examDate`, `track` | lo local si existe | igual |
| `ai`, `theme` | no viajan | igual |

Propiedades con test (además de los casos): `merge(a, a) == a`; ningún elemento de `a` ni de `b` falta en `merge(a, b)` salvo cuando su clave tiene en el resultado un valor más avanzado/reciente por la tabla; aplicar dos veces da lo mismo que una. El test de caracterización de C1 2.4 se actualiza solo en las filas marcadas "nuevo"/"cambia", en la misma tarea y con el motivo.

## Sin conexión y sesión (AC-16 a AC-19)

- **AC-16.** Nada nuevo de red en el arranque: el guardián y `arranque.ts` funcionan sin red (sin token nuevo no esperan nada). El SW ya sirve la app y el contenido usado. Las vistas de IA ya encolan o avisan (`queue.ts`); se comprueba vista a vista.
- **AC-17.** Ya existe: `save()` → `schedule()` → `push()`, y `online` → `flush()`. Se prueba.
- **AC-18.** `refreshSession` con 401 quita el token pero el marcador sigue → el guardián deja pasar. La app enseña un aviso persistente en el lateral y en Cuenta: "Tu sesión caducó. Lo que hagas se guarda aquí; entra otra vez para pasarlo a tu cuenta" con acción "Entrar" (lleva a la landing en el formulario, sin `salida`, así que volver a la app sigue permitido). Con la misma cuenta: IGUAL + `pullAndMerge()`, que sube todo lo local. `sync.ts` ante `not_authenticated` deja `dirty` y no reinicia la versión; la cola de IA trata el 401 como la falta de red (no gasta intentos).
- **AC-19.** Lo cubre la fusión (tabla) más el reintento ante 409. Prueba con dos contextos de navegador y una API simulada con versión.

## IA (AC-21, AC-22)

### Servidor: sesión obligatoria
- **Node ahora**: `netlify/functions/ai-chat.mts` llama a `requireUser(req)` justo después del 405 (K-12). Sin sesión o caducada → 401 `not_authenticated`; bloqueada → 403 `account_blocked`. Ni lectura del cuerpo, ni `reservar()`, ni llamada al proveedor.
- **Contrato** (`tests/contract/ai-chat.test.mts`): casos nuevos de 401/403 sin fila en `ai_usage` y sin petición al simulado; los casos anónimos (`anon_limit`, gasto heredado por IP) se sustituyen por "sin sesión → 401"; el resto de casos pasan a llevar sesión. Regla de BES (API congelada desde 1.13): contrato y servidor cambian en la misma tarea.
- **Laravel después**: lote **a** aporta la resolución de sesión (`ResolveSession`, 401/403); lote **c** la usa en `ChatController` con el mismo orden. Si lote c ya está hecho cuando se haga esta tarea, `ChatController` y su test Feature cambian en la misma tarea; si no, lote c implementa directamente el contrato nuevo (c.6 lo lee). `/api/harness/runs` ya exige sesión por su propio spec.
- `/api/quota` y `/api/auth/session` no cambian (K-13).

### Cliente: fuera la clave propia
- `ai.ts`: se quitan `usesOwnKey`, `ownKeyEndpoint`, la rama de `fetch` directo y los mensajes que mandan a "tu propia clave" o a "créditos de prueba"; `needsAccount` solo mira `not_authenticated`, que ahora significa "sesión caducada" (AC-18).
- `settings.ts`: fuera `ownKeyCard` y el texto de cabecera; el selector de modelo se queda (lo usa el servidor).
- El valor `S.ai.key` que alguien ya tuviera sigue en el blob (no se cambia la forma) y deja de leerse. Si se vacía o no, ver "Decisiones para el dueño".

## Bienvenida y "Mi seguimiento" (AC-24 a AC-28)

### Lo que sale con esta feature, sin harness
- **AC-24 (parte del cliente).** El punto de partida que llega a la cuenta es el diagnóstico (de la landing o del onboarding, en `tracks[ruta].diag` y `stats.diag`, forma de siempre) más el progreso subido. El harness lo leerá con `leer_progreso`/`StartingPoint`.
- **AC-25 (rama sin modelo).** El paso 3 del onboarding pasa a ser la bienvenida: `bienvenida.ts` con el resultado del diagnóstico y el plan de la ruta:
  - nivel por área del diagnóstico: aciertos/preguntas y banda con los mismos umbrales que la guía del harness (< 50 % por debajo, 50–75 % en nivel, > 75 % por encima);
  - tres puntos para empezar: las tres áreas con menor acierto (empates por orden del diagnóstico);
  - qué toca hoy: el día de inicio (escala 1/4/9/13 de siempre) y los bloques de ese día (`days()`).
  Es texto por plantilla, sin modelo, y distinto para diagnósticos distintos. Solo aparece cuando hay diagnóstico en la primera entrada; un estudiante que sube progreso sin diagnóstico nuevo no la ve.

### Lo que depende del harness (fase 8, bloqueada)
| AC | Necesita del harness | Estado en `specs/harness-alumno/plan.md` |
|---|---|---|
| 25 (redactada por el modelo) | Un tipo de ejecución `bienvenida` (sin herramientas, una llamada, salida validada) con caída a la plantilla | **No existe**: hay `explicar`, `revisar_plan`, `ejercicios` |
| 26 | `GET /api/learner/perfil` con evolución semana a semana por destreza y el origen de cada dato | El perfil no trae serie semanal ni origen por dato (solo `ejemplo` en errores recurrentes) |
| 26 | Propuestas pendientes | `GET /api/learner/propuestas` existe |
| 26 | Vista propia "Mi seguimiento" | El harness monta su isla en `Account.astro`; el rediseño prohíbe añadir vistas |
| 27 | Eventos de cada ejercicio, también offline | `eventOutbox` (S-5) existe; su clave tiene que ser por cuenta (AC-20) |
| 28 | Descarga completa | `GET /api/learner/exportar` existe |

Esta feature no construye nada de eso: deja el hueco (la fase 8 de `tasks.md`) con sus tests y lo enlaza cuando el harness exista.

## Service worker y precache (AC-7, AC-16)

- `scripts/precache.mts`: añade `./bienvenida/` y `./bienvenida/index.html` al esqueleto. Los bundles de la landing y de `muestra-datos` son `.js` que no casan con `esContenido()` → van al esqueleto solos; se comprueba en el test de clasificación (el de `scripts/precache-lib.mts` si C1 3.2 ya lo creó; si no, uno nuevo sobre la lista de salida). Presupuesto: la landing añade ≤ 60 KB gzip al esqueleto; se mide en la tarea y se anota.
- `public/sw.js`: el respaldo de navegación sin red elige la página: ruta bajo `bienvenida/` → `./bienvenida/index.html`; el resto → `./index.html` (como hoy).
- La API sigue sin cachearse (ya excluida).

## Data Model

Sin cambios en la base de datos ni en el esquema del servidor. Solo cliente:

| Almacén | Clave / campo | Forma | Nuevo |
|---|---|---|---|
| `localStorage` | `ruta-b1b2-cuenta` | `{ v: 1, id: string /^[0-9a-f]{16}$/, salida: string \| null }` | sí |
| `localStorage` | `ruta-b1b2-v1@<id>`, `ruta-b1b2-sync-version@<id>` | copia literal de la clave sin sufijo | sí |
| `localStorage` | `ruta-b1b2-v1-copia` | copia literal de `ruta-b1b2-v1` | sí |
| `sessionStorage` | `ruta-muestra-diag` | `{ v: 1, track: TrackId, respuestas: Record<string, number>, hecho: string }` | sí |
| `BroadcastChannel` | `ruta-relevo` | `{ tipo: "pide" }` · `{ tipo: "da", resultado: <lo de arriba> }` | sí |
| IndexedDB `ruta-b1b2-cola` | `Pendiente.cuenta?` | `string` (id de cuenta) | campo opcional |
| `AppState` (`ruta-b1b2-v1`) | — | sin cambios | no |

## API Contracts

| Endpoint | Cambio | Quién lo usa aquí |
|---|---|---|
| `POST /api/ai/chat` | **Sesión obligatoria.** Orden: preflight → 405 → sesión (401 `not_authenticated` / 403 `account_blocked`) → cuerpo (413/400) → `bad_kind` → … (resto igual). Sin sesión no hay fila en `ai_usage` ni llamada al proveedor. | app |
| `GET /api/auth/session` | sin cambios. La landing lo llama sin `X-Device-Id` y solo lee `accounts`. | landing, app |
| `POST /api/auth/request` | sin cambios. Errores usados: 422 `bad_email`, 429 `too_many_links`, 404 `accounts_off`, 502 `mail_failed`. | landing |
| `GET /api/auth/verify` | sin cambios: 302 a `<base>/#auth=<token>` \| `expired` \| `error`. | guardián |
| `GET/PUT /api/progress` | sin cambios (incluido 409 `version_conflict` con `server`). | app |
| `POST /api/auth/session` (logout) | sin cambios. | app |
| `/api/learner/*`, `/api/harness/runs` | los define el harness; esta feature solo los consume en la fase 8. Propuesta para el harness: tipo de ejecución `bienvenida` y `evolucion`/`origen` en el perfil. | app (fase 8) |

Cliente (`src/scripts/api.ts`): `get(path, { dispositivo?: boolean })`, `send(path, method, body, { dispositivo?: boolean })`, `requestLoginLink(email, { dispositivo?: boolean })`; por defecto `true` (comportamiento de hoy).

## Plan de tests (criterio → test)

Unitarios con `node:test` en `tests/*.test.mts` (entran en `npm test`). Navegador con la suite Playwright del rediseño (se supone `tests/ui/` y `npm run test:ui`; la tarea 0.2 anota los nombres reales) contra el build servido en local, con la API simulada por `page.route` (`tests/ui/fake-api.ts`) salvo el smoke final.

| AC | Test |
|---|---|
| 1 | `ui/acceso-guardia.spec`: sin sesión, `/`, `/#plan`, `/#cuenta`, `/#ajustes` → `/bienvenida/`; ninguna vista de estudio en el DOM de la landing; con token o marcador activo → app; con `salida` → landing |
| 2, 23 | `ui/landing-contenido.spec`: textos, exactamente un botón con relleno, teclado, foco, 320/375 px, claro/oscuro, contraste con las utilidades del rediseño; revisión `design:accessibility-review` |
| 3 | `muestra-datos.test` (piezas reales y deterministas por ruta) + `ui/landing-muestra.spec` (las cuatro jugables con corrección) |
| 4 | `landing-aislada.test` + `ui/landing-muestra.spec` (fotos de almacenamiento, recarga) |
| 5 | `ui/landing-muestra.spec` (registro de peticiones) |
| 6 | `ui/landing-muestra.spec`: tras cada actividad, su resultado y "Entrar con tu correo" sin bloquear |
| 6b | `relevo-diag.test`, `diag-muestra.test` (`aplicarResultado`) + `ui/acceso-relevo.spec` (misma pestaña, otra pestaña, pestaña cerrada, cuenta con diagnóstico) |
| 7 | `ui/landing-offline.spec` sobre `astro preview` del build: cargar, cortar red, recargar, jugar |
| 8, 10, 11 | `ui/landing-entrada.spec` con la API simulada (cada error, sin red, `accounts:false`, sin API, enlace caducado); smoke real con Mailpit en el punto de control final |
| 9 | `ui/acceso-primera-entrada.spec`: cuenta nueva sin progreso → onboarding; cuenta con progreso en servidor y dispositivo vacío → sin onboarding (K-14) |
| 12, 14, 15 | `ui/acceso-primera-entrada.spec` con un estado local real (fixture): mismas cifras en cada vista antes y después; `PUT` canónico; copia hasta el 200 |
| 13 | `merge.test` (tabla y propiedades) + `ui/acceso-primera-entrada.spec` (dos estados reales) |
| 16 | `ui/offline.spec`: tras entrar, sin red, los 18 módulos con una acción cada uno, sin errores de consola; IA dice "sin conexión" en su sitio |
| 17 | `ui/offline.spec`: cambios sin red → `PUT` al volver, sin acción |
| 18 | `ui/sesion-caducada.spec`: 401 → sigue estudiando, aviso, reentrar → `PUT` con lo pendiente; cola sin intentos gastados |
| 19 | `merge.test` + `ui/dos-dispositivos.spec` (dos contextos, 409 simulado, resultado con los dos cambios) |
| 20 | `cuenta-local.test` + `ui/salir-y-otra-cuenta.spec` (A sale → landing; B entra → no ve nada de A; A vuelve → lo suyo intacto; cola de A no se lanza con B) |
| 21 | `tests/contract/ai-chat.test.mts` contra Node (y contra Laravel cuando exista lote c) |
| 22 | `ui/sin-clave-propia.spec`: Ajustes sin campo de clave; con `ai.key` sembrado, ninguna petición fuera de `/api/ai/chat`; ningún texto de "clave propia" |
| 24, 25 (sin modelo) | `bienvenida.test` + `ui/bienvenida.spec` (dos diagnósticos → dos mensajes) |
| 25 (modelo), 26, 27, 28 | Fase 8, cuando exista el harness (tests listados en `tasks.md`) |

Fixtures: `tests/fixtures/progreso-local-real.json` y `tests/fixtures/progreso-cuenta-real.json`, sacados de "Exportar copia" de navegadores reales del dueño y anonimizados (textos de writing sustituidos por texto de la misma longitud, sin `ai`). Si C1 2.x ya dejó fixtures reales en `tests/fixtures/`, se reutilizan.

## Cambios respecto al spec

| Spec | Cambio | Motivo |
|---|---|---|
| AC-15 "byte a byte" | Igualdad de JSON canónico, quitando `ai` y `theme` | `jsonb` no conserva bytes; `ai` y `theme` nunca viajaron (clave y preferencia del aparato). |
| AC-13 "el más reciente" | Por aproximación donde no hay fecha (tabla de reglas) | Sin cambiar la forma de lo guardado. |
| AC-6b | El resultado pasa entre pestañas del mismo navegador si la landing sigue abierta | Es lo que permite "misma pestaña" + "si se cierra, se pierde" sin servidor. |
| AC-25, AC-26, AC-27, AC-28 | Solo la bienvenida sin modelo sale con esta feature; el resto, en la fase 8 bloqueada por el harness | El perfil, la exportación y los eventos son del harness. |
| AC-21 | El cupo anónimo deja de usarse en el chat; su código de lectura de cuota se queda | Contrato congelado de `/api/quota` y `/api/auth/session`. |

## Conflictos con otras features

| Feature | Conflicto | Propuesta |
|---|---|---|
| `rediseno-limpio` | Non-goal "no añadir vistas" frente a "Mi seguimiento" (AC-26); la maqueta debe incluir la landing antes de maquetarla; `Base.astro`, `index.astro` y `global.css` los tocan las dos; su `tasks.md` (con la suite Playwright de la que depende esta) aún no existe | Decisión del dueño sobre la vista; landing después de la maqueta; esta feature entra en esos archivos después de la tarea del rediseño que los toque. |
| `harness-alumno` | Spec y plan aún tienen casos "sin cuenta" y "clave propia" (AC-3); la isla va en `Account.astro`; no hay ejecución `bienvenida`; el perfil no trae evolución semanal ni origen por dato; `ruta-b1b2-eventos` y la clave del aviso de privacidad deben ser por cuenta; `StartingPoint` lee `stats` pero no las respuestas de `diag` por área | Reescribir esas partes del harness al planificarlo (lo dice su propio aviso de cabecera); añadir las dos claves a `CLAVES_POR_CUENTA`. |
| `tutor-contextual` | Su regla de disponibilidad (AC-5–AC-8, AC-48, tareas 3.1, 4.3, 7.1) cuenta con clave propia y créditos anónimos, que esta feature quita | Simplificar la regla: IA disponible = sesión + red + servidor + cuota. Lo decide quien planifique TUT; esta feature solo quita la vía. |
| `ruta-b2-c1` | `merge.ts` (2.4–2.6) debe existir antes; `sw.js`/`precache.mts` (fase 3); `onboarding.ts`/`diagnostic.ts` (5.5) | Esta feature va después de esas tareas en esos archivos. |
| `selector-de-ruta` | `onboarding.ts` (fases 4–5) | Después de SEL. |
| `backend-separado` | API Node congelada: cambiar `ai-chat.mts` exige contrato y Laravel en la misma tarea; la fase 6 mueve `src/` a `frontend/` | Tarea 2.x hecha antes de BES lote c (o incluyendo `ChatController`); rutas de este `tasks.md` se actualizan en BES 6.5. |
| `refuerzo-seguimiento-recordatorios` | Su "Seguimiento" y su AC-21 ("todo funciona sin cuenta") chocan con el principio 8 enmendado y con "Mi seguimiento" | Revisar esa spec antes de planificarla. |

## Riesgos

- **Estudiantes que no pueden recibir el correo** quedan fuera de su progreso (no lo pierden: sigue en `ruta-b1b2-v1`). Mitigación: comprobar proveedor de correo y `ACCOUNTS_ENABLED` en producción antes de desplegar (tarea **[AUT]** final); la landing dice que su progreso sigue en el navegador.
- **Copia publicada sin API** (estática): con esta feature solo sirve la landing. Es consecuencia directa del principio 8 enmendado.
- **Navegador compartido antes de esta feature**: el primero que entra adopta el progreso sin dueño (es lo que pide AC-12).
- **Relevo entre navegadores** imposible (ver arriba).
- **Fusión**: un error borra progreso de verdad. Mitigación: tabla con test por fila, propiedades, copia literal antes de la primera fusión, fixtures reales.
- **Cuota de `localStorage`** al archivar cuentas (≈ 5 MB): con dos o tres cuentas en un aparato cabe; si falla la escritura, `alinear` aborta sin tocar nada y lo dice.
- **Parpadeo** al alinear tarde (red caída entre el enlace y la sesión): recarga visible; caso raro.
- **Pestañas viejas** abiertas antes del despliegue siguen con su código y su clave `ruta-b1b2-v1`: compatible por K-6; su fusión es la vieja (con las pérdidas de hoy) hasta que recarguen.

## Decisiones para el dueño

1. **"Más reciente" sin fecha (AC-13).** Se aplica la tabla de reglas (lo más avanzado, el contador de repasos de la tarjeta, a igualdad lo local). La alternativa es añadir una marca de tiempo opcional por ítem desde ahora (sin cambiar la forma, pero tocando todas las vistas que escriben tarjetas, gramática y textos). Recomendado: la tabla.
2. **Relevo del diagnóstico entre navegadores (AC-6b).** Si el enlace se abre en otro navegador (navegador interno de la app de correo en el móvil), el resultado se pierde y hay que repetir las diez preguntas. Evitarlo exige guardar la muestra en el servidor, que el spec prohíbe. Recomendado: aceptar el límite.
3. **Clave de DeepSeek ya guardada (AC-22).** Quitar la opción deja la clave de quien la puso dormida en `localStorage`. Recomendado: vaciar el valor una vez (no cambia la forma) y avisar de que la revoque en DeepSeek si ya no la usa. Alternativa: dejarla y solo ignorarla.
4. **"Mi seguimiento" (AC-26).** ¿Vista nueva en el lateral (choca con el non-goal del rediseño y con el montaje del harness en Cuenta) o sección dentro de Cuenta? Recomendado: vista nueva en "Atajos", moviendo ahí la isla del harness.
5. **Bienvenida redactada por el modelo (AC-25).** Necesita un cuarto tipo de ejecución del harness (`bienvenida`, una llamada, ~1 crédito por estudiante nuevo). Recomendado: sí, con la plantilla como caída.
