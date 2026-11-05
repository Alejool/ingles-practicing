# Backend separado

## Overview
Hoy la API vive dentro del proyecto de la app como funciones de Netlify (`netlify/functions/*.mts`) y se sirve con tres adaptadores distintos: Netlify (las funciones tal cual), Docker (`server/index.mts`, que además sirve los estáticos) y Vercel (`api/[...ruta].ts`, con la lista de endpoints escrita a mano). Cada endpoint nuevo hay que darlo de alta en tres sitios, la IP del cliente se resuelve de forma distinta en cada plataforma, y los límites de tiempo de una función serverless (segundos) impiden cualquier trabajo de IA de varios pasos, que es justo lo que necesita `specs/harness-alumno/`.

Esta feature separa el repositorio en dos partes con un límite claro:

- `frontend/`: la app Astro actual, que pasa a ser solo archivos estáticos (más su service worker) y llama a la API en una dirección base configurable.
- `backend/`: un único servidor HTTP en Node/TypeScript, empaquetado en Docker para un VPS, que sirve todos los endpoints que existen hoy con el mismo comportamiento.

Se retiran los adaptadores de Netlify, Vercel y el servidor mixto de `server/`. Es un cambio de sitio y de forma de servir, **no** de comportamiento: ningún endpoint cambia lo que acepta, lo que responde ni lo que guarda.

### Cómo es hoy (medido en el código, 2026-11-05)
- Endpoints (`config.path` de cada archivo de `netlify/functions/`): `/api/admin`, `/api/ai/chat`, `/api/auth/request`, `/api/auth/session`, `/api/auth/verify`, `/healthz`, `/api/progress`, `/api/pulse`, `/api/quota`, `/api/readings` y `/api/deepseek` (obsoleto, responde siempre 410 `gone`; `deepseek.mjs`). Módulos internos: `_auth`, `_db`, `_http`, `_mail`, `_quota`.
- `server/index.mts` carga las rutas leyendo la carpeta `netlify/functions` en tiempo de arranque, sirve `dist/` con compresión y responde `/healthz` por su cuenta antes de buscar la función (mismo cuerpo y códigos que `health.mts`: `{ok:true}` 200 / `{ok:false, db:false}` 503).
- `api/[...ruta].ts` (Vercel) importa los endpoints uno a uno; no incluye `/api/deepseek`.
- La IP del cliente depende de `plataforma()` en `_http.mts` (`PLATAFORMA_API`, `VERCEL`, `NETLIFY`…) y, en Docker, de `ipDeProxy()` con `TRUST_PROXY`.
- CORS ya existe (`corsHeaders()` con `ALLOWED_ORIGINS`, por defecto `*`; cabeceras permitidas `Content-Type, Authorization, X-Device-Id`). La sesión viaja en `Authorization: Bearer`, no en cookies, así que un origen distinto no rompe la autenticación.
- El cliente ya admite `PUBLIC_API_BASE` (`src/scripts/api.ts:9`); vacío = mismo origen. En desarrollo Astro hace de proxy hacia `DEV_API_TARGET`.
- El enlace mágico vuelve a `return_to` (validado por `safeReturnTo()`) o a `APP_URL`; `auth-verify` responde un 302 a `${base}/#…`.
- `shared/prompts.ts` y `shared/sanitize.ts` los usan a la vez el cliente (`ai.ts`, `library.ts`, `queue.ts`, `views/reading.ts`, `views/tutor.ts`) y el servidor (`ai-chat.mts`, `readings.mts`).
- Despliegue: un push a `master` publica en Netlify (`netlify.toml`). `.github/workflows/deploy.yml` publica en GitHub Pages en cada push a `main` (rama que hoy no se usa). `Dockerfile` y `docker-compose.yml` construyen una sola imagen con front y API.
- Tests: `npm test` (`node:test`, `tests/*.test.mts`), que importan módulos de `netlify/functions/` y `src/scripts/`.

## User Stories
- Como dueño del proyecto, quiero un backend que se despliegue igual en cualquier VPS con Docker, sin depender de las reglas de tiempo y empaquetado de Netlify o Vercel.
- Como dueño, quiero añadir un endpoint en un solo sitio, no en tres.
- Como dueño, quiero publicar el front como archivos estáticos donde prefiera y apuntarlo a la API con una sola variable.
- Como estudiante con cuenta, no quiero notar el cambio: mi sesión, mi progreso, mis créditos y mis lecturas siguen igual.
- Como estudiante sin cuenta o sin conexión, quiero que la app funcione exactamente igual que antes (la app no necesita servidor para estudiar).

## Acceptance Criteria

### Estructura
- [ ] AC-1: En la raíz del repositorio existen `frontend/` (la app Astro: `src/`, `public/`, configuración de Astro y sus scripts de build y precache) y `backend/` (servidor, endpoints, módulos internos, `db/schema.sql`, `Dockerfile` del backend). Ningún archivo de la app queda duplicado en las dos carpetas.
- [ ] AC-2: El código que comparten front y back (`shared/prompts.ts`, `shared/sanitize.ts` y lo que la ruta B2-C1 añada, p. ej. `shared/tracks.ts`) tiene una única copia, importable desde las dos partes. El plan decide dónde vive; no se copia a mano.
- [ ] AC-3: Los archivos se mueven con historial (`git mv` o equivalente): `git log --follow` sobre cualquier endpoint movido muestra sus commits anteriores.
- [ ] AC-4: Cada parte tiene su propio `package.json` con sus scripts (`dev`, `build`, `test`, `check`) y sus dependencias; las del back no aparecen en el bundle del front. Desde la raíz hay una forma documentada de correr todos los tests y todos los builds con un solo comando.

### Backend: un solo servidor
- [ ] AC-5: `backend/` arranca un único proceso HTTP de Node/TypeScript que registra todas las rutas en una lista explícita en un solo archivo (sin leer carpetas en tiempo de ejecución). Añadir un endpoint = una línea en esa lista más su archivo.
- [ ] AC-6: Responde exactamente las mismas rutas que hoy: `/api/admin`, `/api/ai/chat`, `/api/auth/request`, `/api/auth/session`, `/api/auth/verify`, `/healthz`, `/api/progress`, `/api/pulse`, `/api/quota`, `/api/readings` y `/api/deepseek` (410 `gone`). Cualquier otra ruta bajo `/api/` responde 404 `not_found` en JSON, como hoy en Docker.
- [ ] AC-7: Un test de contrato por endpoint, escrito **antes** de mover nada y en verde contra el código actual, fija para cada método aceptado: código de estado, cuerpo JSON (forma y códigos de error), cabeceras `Cache-Control: no-store` y CORS, y efecto en la base (filas creadas). Esos mismos tests pasan sin modificar sus aserciones contra el backend nuevo. Cubre como mínimo: enlace mágico (petición, verificación con 302 y destino, sesión), cuota (`/api/quota` y `X-Quota-Remaining`), reserva y anulación en `ai_usage` (con DeepSeek simulado), progreso (GET, PUT, conflicto de versión), lecturas (listar, crear, ocultas), latido, admin (sin token → rechazo; con token → mismas acciones) y `/healthz` (200 con base, 503 sin base).
- [ ] AC-8: La cuota y su reserva atómica (`reservar()`, `anularReserva()`, `recordUsage()`) se conservan sin cambios de lógica; los tests existentes `tests/quota.test.mts` y `tests/client-ip.test.mts` siguen en verde (movidos de sitio si hace falta, sin cambiar aserciones salvo rutas de import).
- [ ] AC-9: La IP del cliente en el backend se resuelve solo desde el socket y `TRUST_PROXY` (`ipDeProxy()`): una cabecera `X-Forwarded-For`, `X-Nf-Client-Connection-Ip` o `X-Vercel-Forwarded-For` enviada por el cliente no cambia la IP con la que se cuenta la cuota. Test que lo demuestra.
- [ ] AC-10: El backend ya no sirve los estáticos del front: `GET /` y cualquier ruta que no sea de la API ni `/healthz` responde 404.
- [ ] AC-11: El servidor no impone un límite de tiempo por petición inferior al actual de Docker (las correcciones largas siguen terminando) y cierra limpio con SIGTERM/SIGINT (cierra la base antes de salir), como `server/index.mts` hoy.
- [ ] AC-12: La imagen Docker del backend arranca con `docker compose up` usando PostgreSQL y aplica `db/schema.sql` igual que hoy (idempotente); `HEALTHCHECK` contra `/healthz`. El modo local con pglite (`start:local`) sigue funcionando para desarrollo.
- [ ] AC-13: Todas las variables de entorno que se usan hoy (`DATABASE_URL`/`DB_DRIVER`, `DEEPSEEK_*`, `QUOTA_*`, `ACCOUNTS_ENABLED`, `MAIL_*`, `APP_URL`, `ALLOWED_ORIGINS`, `IP_PEPPER`, `TRUST_PROXY`, token de admin…) mantienen nombre y significado. `backend/.env.example` las lista todas; desaparecen solo las que eran exclusivas de una plataforma retirada, y el plan las enumera.

### Frontend: estático
- [ ] AC-14: `frontend/` construye con `npm run build` (incluye `astro check` y precache) a una carpeta de estáticos que se puede servir con cualquier servidor de archivos, sin Node en producción.
- [ ] AC-15: La dirección de la API se configura en el build con `PUBLIC_API_BASE`. Vacía = mismo origen (para servir front y API detrás del mismo dominio con un proxy). Con valor = otro origen (p. ej. `https://api.ejemplo.com`). Las dos formas se prueban.
- [ ] AC-16: Con la API en otro origen y ese origen del front en `ALLOWED_ORIGINS`: el inicio de sesión por enlace mágico (petición, correo, vuelta al front con la sesión), la sincronización de progreso, la cuota y una llamada de IA funcionan en el navegador. Con un origen no listado, el navegador bloquea la respuesta (CORS) y el front lo trata como "sin servidor", sin romper la app.
- [ ] AC-17: El enlace mágico lleva al front correcto: `return_to` sigue validado por `safeReturnTo()` y `APP_URL` apunta al front, no a la API.
- [ ] AC-18: Sin API configurada o sin red, la app se usa entera como hoy (sin cuenta, offline, con clave propia de DeepSeek si el estudiante la puso). El progreso guardado en `localStorage`/IndexedDB no cambia de forma ni de claves.
- [ ] AC-19: `npm run dev` en `frontend/` sigue teniendo proxy a `DEV_API_TARGET` (por defecto el backend local), así que en desarrollo no hace falta CORS.
- [ ] AC-20: El service worker y el precache siguen funcionando: tras desplegar el front, una instalación existente de la PWA se actualiza sin perder progreso y las peticiones a la API no se cachean (`no-store`).

### Retirada de adaptadores
- [ ] AC-21: Ya no existen en la rama: `netlify.toml`, `vercel.json`, `api/[...ruta].ts`, la carpeta `netlify/` (su contenido vive en `backend/`), `server/index.mts` y la dependencia `@netlify/functions`. La función `plataforma()` y las ramas de Netlify/Vercel de `clientIp()` desaparecen con su test adaptado (AC-9).
- [ ] AC-22: Las cabeceras que hoy pone `netlify.toml` (seguridad, caché de `_assets/` inmutable, `sw.js` y `manifest` sin caché, API `no-store`) quedan documentadas para el servidor de estáticos del front y, las de la API, puestas por el backend. Nada queda solo en un archivo de plataforma retirado.
- [ ] AC-23: `DESPLIEGUE.md`, `README.md`, `start.sh`, `desplegar.sh` y `docker-compose.yml` describen la estructura nueva; ningún documento de la rama indica todavía desplegar con Netlify o Vercel.

### Transversal
- [ ] AC-24: `npm test` (todas las suites, front y back) y `npm run test:plan` en verde; `npm run build` del front y el build/arranque del back sin errores; `astro check` sin errores ni avisos nuevos.
- [ ] AC-25: Un smoke de extremo a extremo con Docker (`bash start.sh test` o su sustituto) pasa contra la estructura nueva con DeepSeek simulado; la variante con llamadas reales solo se corre si el dueño lo pide.
- [ ] AC-26: `git diff --stat` del cambio muestra solo movimientos, el servidor nuevo, la configuración y la documentación: ningún cambio en `src/data/`, en `db/schema.sql` (salvo moverlo), ni en la lógica de los endpoints más allá de rutas de import y la eliminación de la detección de plataforma.

## Non-Goals
- Reescribir el backend en Laravel u otro framework, o añadir un framework HTTP. El servidor es Node con `node:http` (o lo mínimo que justifique el plan).
- Cambiar el comportamiento de cualquier endpoint: parámetros, respuestas, códigos de error, límites de cuota, precios, prompts.
- Cambios en la base de datos: ni tablas, ni columnas, ni índices nuevos, ni migraciones, ni UPDATE/DELETE de datos. El harness añadirá sus tablas en su propia feature.
- Desplegar: ni VPS, ni DNS, ni TLS, ni publicar el front. Esta feature deja el repositorio listo y probado en local; el despliegue es una tarea aparte con OK explícito del dueño.
- Cambiar el pipeline de despliegue de `master` (ver Riesgos): solo se documenta qué hay que hacer.
- Tocar `_viejo/` o `server/laravel/` (fuera de alcance; se decide aparte si se retiran).
- Rediseño de UI o cualquier cambio visible para el estudiante.
- Monorepo con herramientas nuevas (workspaces de Turborepo, Nx…). Si el plan quiere workspaces de npm, lo justifica.
- Cambiar el sistema de tests (sigue `node:test`).

## Riesgos
- **Movimiento masivo de archivos con trabajo en curso.** `specs/ORDEN.md` tiene tres listas abiertas que tocan `src/` y `netlify/functions/` (SEL casi terminado, C1 con fases de código y contenido abiertas, TUT sin empezar el servidor). Mover `src/` a `frontend/src/` y `netlify/functions/` a `backend/` deja sus rutas de `tasks.md` desfasadas y provoca conflictos en ramas paralelas. Mitigación: el movimiento se hace en un único commit sin cambios de contenido, en un momento sin otras ramas abiertas sobre esos archivos, y después se actualizan las rutas de las `tasks.md` pendientes (una tarea del plan).
- **El despliegue sale de `master`.** Un merge a `master` con `netlify.toml` retirado rompe el sitio publicado en Netlify (el build ya no encuentra `npm run build` en la raíz ni funciones). Mitigación: no se mergea a `master` hasta que exista el VPS y el front tenga dónde publicarse; el plan incluye la secuencia de corte y vuelta atrás.
- **Usuarios ya instalados.** La PWA instalada apunta a la API en su mismo origen (Netlify). Si el front sigue en el mismo dominio pero la API se va a otro, el `PUBLIC_API_BASE` de la nueva build lo resuelve; si cambia el dominio del front, el progreso en `localStorage` del dominio viejo no se ve en el nuevo (solo lo recupera quien tiene cuenta). Es decisión de despliegue, pero condiciona dónde va el front.
- **CORS y enlace mágico en orígenes distintos.** `ALLOWED_ORIGINS` por defecto es `*`; en producción con dos orígenes hay que fijarlo. `APP_URL` mal puesto manda el enlace a la API.
- **IP del cliente detrás de un proxy en el VPS.** Un `TRUST_PROXY` mal configurado hace que todo el mundo comparta cuota (0 saltos detrás de un proxy) o que la IP sea falsificable (saltos de más). Lo cubre AC-9 y la documentación.
- **Diferencias ocultas entre adaptadores.** El adaptador de Vercel no incluía `/api/deepseek`; Netlify y Docker sí. AC-6 toma como referencia el comportamiento de Docker/Netlify.
- **Borrado de archivos.** Las restricciones de `.agentflow/CONTEXT.md` dicen "sin borrados". Retirar `netlify.toml`, `vercel.json`, `api/` y `server/index.mts` es un borrado y necesita el visto bueno explícito del dueño antes de ejecutarse.

## Open Questions
- [NEEDS CLARIFICATION: dónde se publica el front estático (mismo VPS detrás del mismo proxy, Netlify solo estáticos, GitHub Pages…). Decide si `PUBLIC_API_BASE` va vacío (mismo origen) o con dominio propio de la API. Se asume mismo VPS y mismo dominio, con la API bajo `/api/` y `/healthz` vía proxy inverso.]
- [NEEDS CLARIFICATION: ¿se retira `.github/workflows/deploy.yml` (GitHub Pages en `main`, sin uso) o se reaprovecha para publicar el front? Se asume que se deja como está.]
- [NEEDS CLARIFICATION: ¿se usan workspaces de npm (un solo `node_modules` y lockfile) o dos proyectos independientes? Se asume workspaces de npm, sin herramientas nuevas.]
- [NEEDS CLARIFICATION: ¿cuándo se corta `master` al despliegue nuevo? Esta feature no lo hace; necesita fecha y OK.]
- [NEEDS CLARIFICATION: ¿se aprovecha para borrar `_viejo/` y `server/laravel/`? Se asume que no.]

## Dependencies
- Arreglos de seguridad (SEG) ya confirmados en la rama (`9e60fd2`, `ca1fa02`, `e1d5a16`, `bef3962`): la reserva atómica y la resolución de IP son el comportamiento de referencia que se conserva.
- Que `selector-de-ruta` esté cerrado y que las listas abiertas de `ruta-b2-c1` y `tutor-contextual` estén en un punto de control, para mover archivos sin trabajo a medias (ver `specs/ORDEN.md`).
- Docker en la máquina de desarrollo para AC-12 y AC-25.
- `specs/harness-alumno/` depende de esta feature (trabajo de varios pasos y hasta 45 s por ejecución, que no cabe en una función serverless).
