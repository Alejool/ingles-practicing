# Backend separado — Progreso

## Fase 0 — Requisitos previos — 2026-11-05

### 0.1 Estado de las otras features sobre la API

- Árbol de trabajo: ningún cambio sin confirmar en `netlify/functions/`, `server/`, `shared/`, `db/` ni `tests/` (`git status`). Último commit que toca `netlify/functions/`: `9e60fd2 fix(security): close race in AI quota reservation` (SEG confirmado).
- `selector-de-ruta`: fases 1–5 hechas salvo 4.4 `[~]` y verificación de navegador 6.2–6.6 `[~]`. Solo front (`src/`); no toca la API.
- `ruta-b2-c1`: fases 1 y 2 **sin empezar** (todas `[ ]`); solo la fase 7 (contenido en `src/data/b2c1/`) está en curso. No hay trabajo a medias sobre `pulse.mts`, `progress.mts` ni `readings.mts`.
- `tutor-contextual`: sin empezar en el servidor; nada a medias.
- Conclusión: no hay trabajo a medias sobre la API, así que la fase 1 caracteriza el comportamiento confirmado de hoy. Las fases 1–2 de C1 llegarán **después** de los contratos; según el plan ("Si llegan después, cada cambio va con su contrato y su versión PHP") eso no bloquea, pero esas tareas de C1 tendrán que actualizar `pulse`, `progress` y `readings` en el contrato y en Laravel en la misma tarea (la lista `PISTAS = ["a2b1","b1b2"]` queda fijada hoy por los contratos 1.8 y 1.9).

### 0.2 Línea base

- `npm test`: 94 pass / 0 fail / 0 skip.
- `npm run test:plan`: "Plan correcto en todas las rutas." (A2 → B1 y B1 → B2).
- `npm run build:fast`: correcto; precache esqueleto 11 archivos · 286 KB, contenido 10 archivos · 752 KB.
- `/healthz`: 200 `{"ok":true}`, `Content-Type: application/json`, `Cache-Control: no-store`. Arrancado en local con `server/index.mts` sobre pglite (`./data/pglite`), `PORT=8090`, sin `DATABASE_URL` ni clave de DeepSeek. No se usó el `docker compose` de la raíz: lee `.env` (con la clave real de DeepSeek) y la batería de contrato tiene su propio stack (fase 1.1).

### CP: Fase 0 — 2026-11-05
tests: 94 pass / 0 fail / 0 skip
build: pass [npm test, npm run test:plan, npm run build:fast, /healthz 200]
done: [0.1, 0.2, 0.3]
issues:
- `ruta-b2-c1` fases 1–2 pendientes: cuando se hagan, actualizar en la misma tarea los contratos `pulse`, `readings` y `progress` (y el PHP si ya existe).

## Fase 1 — Contratos HTTP contra la API Node — 2026-11-05 (sesión testing)

### Cómo se ejecutó (Docker caído)

- Docker Desktop no arranca (mismo bloqueo que la fase 2, abajo), así que la batería se puso en verde contra Node **sin Docker**: `server/index.mts` con `--env-file=tests/contract/contract.env`, `DB_DRIVER=pg` contra un clúster PostgreSQL 18 desechable (`initdb` en el directorio temporal de la sesión, `127.0.0.1:5434`, `timezone=UTC` como la imagen `postgres:17-alpine`), `fake-deepseek.mts` en :8790 y `fake-mailpit.mts` en :1025/:8026. Sobrescritos solo `SMTP_HOST=127.0.0.1` y `DEEPSEEK_URL=http://127.0.0.1:8790/chat/completions` (el resto, `contract.env` tal cual). Ni Neon, ni `.env`, ni DeepSeek real.
- El stack Docker de referencia (`tests/contract/compose.node.yml`: Node de la raíz + postgres:17 en tmpfs + Mailpit v1.27 + simulado) está escrito pero **no se ha levantado nunca**. Con Docker arreglado: `npm run contract:up && npm run test:contract && npm run contract:down`. Pendiente comprobarlo una vez (sobre todo la IP del socket y el `localhost` del correo dentro de la red de compose).
- `fake-mailpit.mts` implementa solo lo que usa `_lib.mts` de la API de Mailpit (`/api/v1/search?query=to:"…"`, `/api/v1/message/{ID}`) y un SMTP sin TLS ni auth. Es para correr sin Docker; el compose usa el Mailpit real.

### Desviaciones respecto a tasks.md / plan

- 1.1: el compose de contrato está en `tests/contract/compose.node.yml` (no en `docker/compose.contract-node.yml`): `docker/` es de la fase 2 y lo lleva otro agente. Scripts npm añadidos: `test:contract`, `contract:up`, `contract:down`.
- `_lib.mts` no tiene escritura de preparación: la regla del dueño prohíbe escribir en bases de datos desde la sesión (hook `db-guard`). Consecuencia: **el enlace caducado de 1.4 no está en la batería** (llegar a `expires_at` pasado por HTTP exige esperar 15 min). Usa la misma condición SQL que el desconocido y el usado; queda para el Feature `VerifyLoginLink` de PHPUnit (a.6).
- El simulado admite `GET /__last?marca=<texto>` (la última petición cuyo cuerpo contiene el texto) porque los archivos de test corren en paralelo.

### Rarezas de Node fijadas tal cual (no se cambian; Laravel tiene que imitarlas)

- `X-Quota-Remaining` = `max(0, remaining - 1)` después de reservar (doble descuento; lo arregla TUT).
- `/api/admin`: `por_dia[].personas` es `count(distinct …)` sin `::int` → bigint → **cadena** (`"22"`); el resto de contadores son números y todos los `usd` cadenas con 4 decimales (`usd_por_llamada`, 5).
- `/api/progress`: el `data` pasa por `jsonb` y `JSON.parse`: `0.0` vuelve como `0`, las claves salen en el orden de `jsonb` (por longitud y luego bytes), `/` y UTF-8 sin escapar. `version` como cadena cuenta como 0 (409).
- `/api/auth/request`: un `Origin` con ruta se reduce a su origen (`https://permitido.example/ruta?x=1` → `https://permitido.example`); el tope de 4096 y el de 96 KB de `ai/chat` cuentan caracteres UTF-16, no bytes; el de 2 MB del servidor cuenta bytes.
- Cuerpo > 2 MB → 500 `server_error` **antes** de la sesión (`/api/progress` sin token da 500, no 401), con `Content-Type: application/json` sin charset y sin `no-store` ni CORS.
- `/api/auth/verify` y `/api/deepseek` no tienen preflight (`OPTIONS` redirige / da 410); `/healthz` responde a `OPTIONS` con 200 `{"ok":true}`.
- `GET /api/admin?op=…` y `POST` con `op` desconocida devuelven el informe; con `?token=` erróneo y bearer correcto → 403 (la query manda). `op=hide&show=` distinto de `1` oculta.
- `/api/readings` `?id=…&read=1` con un id inexistente responde `{ok:true}`.

### Bugs

- Ninguno que rompa un contrato. Riesgo de la batería (no de Node): `QUOTA_GLOBAL_DAILY_USD=3` por defecto y cada pasada gasta ~0,07 $ de cuota simulada; con la misma base, a partir de ~40 pasadas en el mismo día UTC empiezan los 503 `global_limit`. El stack Docker usa tmpfs (base nueva en cada `up`); en local, base nueva por sesión.

### CP: Fase 1 — 2026-11-05
tests: contrato 195 pass / 0 fail / 0 skip, **dos pasadas seguidas** sobre base nueva (`ruta_r3`): 3,5 s y 3,2 s. Por archivo: admin 9, ai-chat 31, auth-request 26, auth-session 6, auth-verify 10, body-limits 6, client-ip 6, cors 14, deepseek 5, health 3, not-found 6, progress 24, pulse 9, quota 7, readings 33. Front: `npm test` 94 pass / 0 fail; `npm run test:plan` correcto.
build: pass [`npm run build:fast`; `npm run check` 0 errores (5 avisos, todos en `backend/vendor/filp/whoops/**/*.js`)]
done: [1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.13]
issues:
- Inestabilidad: en ~35 pasadas hubo **un** fallo aislado (`ai-chat` "deepseek-reasoner se respeta y reserva el doble") que no se pudo reproducir (26 pasadas verdes seguidas después). Se endureció la marca (`randomBytes`) y se añadieron mensajes de diagnóstico; si vuelve a salir, el mensaje dirá si fue estado, `/__last` o la fila.
- Sin verificar contra el stack Docker (`compose.node.yml`): ver arriba.
- **API Node congelada desde aquí**: cualquier cambio en `netlify/functions/`, `server/index.mts` o `shared/` que cambie una respuesta actualiza en la misma tarea `tests/contract/` y el PHP. La nota en `specs/ORDEN.md` queda para la tarea 6.5 (es una spec compartida).
- `tsconfig.json` incluye `**/*` y `astro check` ya recorre `backend/vendor/` (los 5 avisos); conviene excluir `backend/` (fase 2).

## Fase 2 — Proyecto Laravel y Docker — 2026-11-05 (sesión devops, interrumpida por Docker)

### Bloqueo

- Docker Desktop 4.82.0 no arranca: el backend se cae al iniciar (`initializing Inference manager: ... remove C:/Users/Olart/AppData/Local/Docker/run/dockerInference`; en `run/` hay tres sockets AF_UNIX huérfanos que Windows no deja ni listar). `docker info` → no existe `dockerDesktopLinuxEngine`. Muestra el diálogo de error "Quit / Reset to factory defaults". Lo tiene que arreglar el dueño (borrar esos tres archivos de `%LOCALAPPDATA%\Docker\run\` con Docker cerrado, o reiniciar Windows, y volver a abrir Docker Desktop). No se tocó.
- Consecuencia: nada de lo escrito en esta fase se ha ejecutado en Docker. Todas las tareas 2.x quedan `[~]`.
- `backend/vendor/` está incompleto (instalación interrumpida en la sesión anterior: falta `laravel/framework`, `phpunit/phpunit` y `vendor/autoload.php`; 304 de 317 paquetes). Hay que repetir `composer install`.

### 2.1 (falta verificar)

- `composer.json`: `laravel/framework` 13.40.0 y `phpunit/phpunit` 12.5.43 exactas (lock: v13.40.0 y 12.5.43); `platform.php` 8.4.22; PSR-4 `Ruta\` → `src/`. Resto del esqueleto sin cambios (tinker, pail, pao, pint, faker, mockery, collision).
- Sin migraciones, vistas ni `routes/web.php` del esqueleto. `bootstrap/app.php` enruta solo `routes/api.php` (`apiPrefix: ''`) y `routes/console.php`; sin `health: '/up'`.
- `.env.example` y `phpunit.xml`: `SESSION_DRIVER=array`, `CACHE_STORE=array`, `QUEUE_CONNECTION=sync`, `pgsql`; PHPUnit contra `ruta_test`.
- Pendiente: `composer install` y `php artisan --version` (= 13.40.0) en el contenedor.

### 2.2 (escrito, sin construir)

- `docker/php/{Dockerfile, Dockerfile.dockerignore, php.ini, www.conf}`: `composer:2.10` (vendor sin dev) → `php:8.4.22-fpm-alpine` + `pdo_pgsql` + `opcache`; `max_execution_time=0`, `output_buffering=Off`, `expose_php=Off`, `post_max_size=3M`; fpm `pm.max_children=${FPM_MAX_CHILDREN}` (16), `request_terminate_timeout=0`, `clear_env=no`, `process_control_timeout=60s`; HEALTHCHECK por socket :9000.
- `docker/nginx/{Dockerfile, Dockerfile.dockerignore, default.conf, headers.conf, fastcgi-api.conf}`: etapa `node:22-alpine` con `npm ci && npm run build` → `nginx:1.29.3-alpine`; `/healthz` y `/api/` a `api:9000` con `fastcgi_buffering off`, `gzip off`, `fastcgi_read_timeout 600s`; `client_max_body_size 3m`; cabeceras de estáticos del plan (`_assets` inmutable, `sw.js`/manifest/html `no-cache`, resto 1 h; nosniff, Referrer-Policy, X-Frame-Options repetidas por `include`); SPA → `index.html`; HEALTHCHECK `/healthz`.
- `docker/compose.yml` (proyecto `ruta2`): `web` 127.0.0.1:8081, `api` (backend montado como volumen), `db` postgres:17-alpine 127.0.0.1:5435 con `ruta_test` creada por `docker/db/init-test-db.sql`, `mailpit` v1.27 127.0.0.1:8027, `migrate` (perfiles `local`/`contract`), `fake-deepseek` (perfil `contract`, 127.0.0.1:8791, monta `tests/contract/fake-deepseek.mts` solo lectura). `DATABASE_URL` fija a la base del stack; no lee el `.env` de la raíz. Variables propias opcionales vía `API_ENV_FILE` (por defecto `backend/.env`).
- Añadidos que no lista el plan (justificados): los dos `Dockerfile.dockerignore` (el contexto es la raíz y su `.dockerignore` no excluye `backend/vendor`), `headers.conf`/`fastcgi-api.conf` (evitan repetir bloques), `docker/db/init-test-db.sql` (base `ruta_test` de PHPUnit).
- Pendiente: `docker compose -f docker/compose.yml --profile local up -d --build --wait` y comprobar el front en :8081 y `curl -i :8081/healthz`.
- Pendiente de la tarea b.2: la exportación de contenido (`scripts/exportar-contenido.mts`) aún no existe; el Dockerfile de nginx la añadirá entonces.

### 2.4–2.9 (escritos test primero; verificados solo los que no necesitan Laravel)

- Tests nuevos: `tests/Feature/Http/{HealthControllerTest, RoutingTest}`, `tests/Architecture/{DomainIsFrameworkFreeTest, AppendOnlyTest}` (+ `tests/fixtures/architecture/*`), `tests/Unit/Http/{JsonBodyTest, ApiJsonTest, ErrorMapTest}`, `tests/Unit/Shared/{ClientIpTest, HashingTest, DeviceIdTest, IsoInstantTest, SystemClockTest}`; fixture `tests/fixtures/hashes.json` generado con el código Node real (comando en `HashingTest`).
- Código: `HealthController`, `GoneController`, `NotFoundController` (fallback `/api/*`), `Middleware/{Cors, BodyLimit}`, `Support/{ApiJson, JsonBody, ErrorMap, HttpError}`, `config/ruta.php` (`allowed_origins`, `trust_proxy`, `ip_pepper`), manejador de excepciones en `bootstrap/app.php` (`DomainError` → JSON con CORS y sin registrar; otro fallo en `/api/*` → 500 `server_error`), `HandleCors` quitado; `Shared\Domain\{DomainError, Clock, ClientIp, Hashing, DeviceId, IsoInstant}`, `Shared\Infrastructure\SystemClock` (enlazado en `AppServiceProvider`).
- Verificación local sin Docker (runner mínimo en el directorio temporal, no versionado, con el polyfill de mbstring del vendor): Shared en rojo (clases inexistentes) y después en verde 22/22; ErrorMap 27/27, JsonBody 7/7, Architecture 6/6. `php -l` limpio en todo `app/ src/ config/ routes/ bootstrap/ tests/`. ErrorMap y JsonBody no se vieron en rojo (se escribieron antes de poder ejecutar nada).
- Sin ejecutar (necesitan Laravel/Postgres): `ApiJsonTest`, `HealthControllerTest`, `RoutingTest`.
- Decisión: `payload_too_large` sale 413 desde `JsonBody` (cuerpo) y 422 desde el dominio (lectura > 1500 palabras), como en Node; por eso `HttpError` (error del borde HTTP con su estado) y `ErrorMap` mapea el código a 422.

### Para cerrar la fase (en orden, con Docker funcionando)

1. `docker run --rm -v "$PWD/backend:/app" -w /app composer:2.10 install`
2. `docker compose -f docker/compose.yml run --rm api php artisan --version` → 13.40.0
3. `docker compose -f docker/compose.yml run --rm api php artisan test` → todo verde
4. `docker compose -f docker/compose.yml --profile local up -d --build --wait`; `curl -i http://localhost:8081/healthz` → 200 `{"ok":true}`; `curl -I http://localhost:8081/` → front
5. Marcar 2.1, 2.2, 2.4–2.9 `[x]` y seguir con 2.10.

## Fase 2 — correcciones de revisión — 2026-11-05 (sesión devops)

Hallazgos de code-review/testing sobre L3 (`.agentflow/TASKS.md`), devueltos al autor. Empezó con Docker caído (runner PHP mínimo + `php -l`); a mitad de sesión Docker volvió y todo se verificó en el contenedor.

| # | Hallazgo | Arreglo | Verificación |
|---|---|---|---|
| 1 | `APP_KEY` con valor por defecto público (`docker/compose.yml`) | `APP_KEY: "${APP_KEY:?…}"` sin defecto: compose no arranca sin ella. Local y contrato: `--env-file docker/local.env` (clave pública a propósito, solo local; dicho en el archivo). Producción exporta la suya (`php artisan key:generate --show`). Elegido frente a un override o un perfil porque `${…:?}` se evalúa en el archivo base y un perfil no puede dar valores por defecto; así un olvido en producción falla en vez de colar la clave pública. Coste: cada comando `docker compose` de este stack lleva `--env-file docker/local.env` (cabecera de `compose.yml` actualizada). | `docker compose -f docker/compose.yml config` sin env-file → "required variable APP_KEY is missing a value"; con `--env-file` → ok. |
| 2 | Renderer catch-all solo `api/*` (`bootstrap/app.php`) | `is('api', 'api/*', 'healthz')`; las `HttpException` pasan de largo (si no, un 404 se volvía 500); en `/healthz` el 500 sale sin CORS (`ApiJson::bare`). | PHPUnit (`RoutingTest`). |
| 3 | `/api` sin barra sirve el SPA (nginx) | **Es la paridad con Node**: `server/index.mts` solo manda a la API lo que `startsWith("/api/")`; `/api` va a `serveStatic` → `index.html`. Se mantiene, pero nginx respondía **301 → `/api/`** (redirección automática de las `location` con barra final y `fastcgi_pass`): añadido `location = /api` que sirve `index.html` con las cabeceras del shell. Además `/api/` llega a Laravel como `api` (quita la barra) y caía en el 404 HTML de Laravel: el fallback pasa a `/api/{path?}`. | `curl` a :8081: `/api` 200 shell `no-cache`; `/api/` 404 JSON. `not-found.test.mts` `GET /api/` verde contra Laravel. `RoutingTest::test_api_root_is_the_json_404` visto en rojo y luego en verde. |
| 4 | `BodyLimit` solo en un grupo | `$middleware->api(prepend: [BodyLimit::class])`: toda ruta de `routes/api.php` lo hereda; `/healthz` y el 404 lo quitan con `withoutMiddleware` (en Node tampoco leen el cuerpo). | `RoutingTest`: 500 sin `Cache-Control` ni CORS en `/api/deepseek`; `/healthz` y `/api/xyz` con 2 MB+1 → 200/404; una prueba recorre las rutas y exige el tope en cada endpoint. `curl` de 2 MB+1 a :8081 → 500 sin `Cache-Control`. |
| 5 | `extra` puede pisar `code`/`message` (`ErrorMap`) | `array_diff_key($extra, code/message)` tras `code` y `message`: no los pisa y conserva el orden de claves (poner `extra` primero cambiaba el orden del JSON). | `ErrorMapTest::test_extra_can_never_override_code_or_message`, rojo → verde. |
| 6 | `HealthController` se traga la excepción | `LoggerInterface::error('[healthz] base no disponible', {exception: clase, message})`; respuesta 503 idéntica. El mensaje de PDO/`QueryException` lleva host, puerto y base, nunca la contraseña ni `DATABASE_URL`. | `HealthControllerTest::test_database_down_is_503_and_is_logged_without_changing_the_response` (Mockery de conexión y logger). No se vio en rojo (escrito con Docker caído junto al arreglo). |
| 7 | JSON de error escrito a mano 3 veces | `ApiJson::bare(status, code, message, cacheControl = 'no-store')`, sin CORS ni charset; lo usan `GoneController`, `NotFoundController`, `BodyLimit` (con `null`) y el 500 de `/healthz`. | `tests/Unit/Http/ApiResponseTest.php` (rojo → verde): cuerpos byte a byte de `gone`, `not_found` y `server_error`. |
| 8 | `Controller.php` muerto | Borrado. | Sin referencias; PHPUnit verde. |
| 9 | `ClientIp` con más saltos que cadena | Se mantiene la paridad con `ipDeProxy`: gana la de más a la izquierda (la pudo escribir el cliente; es un `TRUST_PROXY` mal configurado). | `ClientIpTest::test_more_hops_than_chain_falls_back_to_the_leftmost_entry` (caracteriza; verde desde el principio). |
| — | `tsconfig.json` recorría `backend/vendor` | `"backend"` en `exclude`. | `npm run check`: 182 archivos, 0 errores, 0 avisos, 0 pistas. |

### Hallado al verificar (fuera de la revisión)

- **Symfony reescribe `Cache-Control`** en todas las respuestas PHP: `no-store` → `no-store, private`; sin cabecera → `no-cache, private`; directivas ordenadas (`public, max-age=120` → `max-age=120, public`). El contrato compara la cadena exacta (`health`, `not-found`, `deepseek`, `body-limits` sin cabecera, `readings` `public, max-age=120`, `ai-chat` `no-store, no-transform`). Arreglo: `App\Http\Support\ApiResponse`, subclase de `Response` con una `ResponseHeaderBag` que no recalcula `Cache-Control` y lo quita si queda vacío (Symfony 8.1 exige pasar la bolsa por el constructor). La usan `ApiJson::json`, `preflight`, `bare` y `HealthController`. Los tests PHP que solo miraban `assertStringContainsString('no-store')` pasan a `assertSame`.
- **`phpunit.xml` sin `force="true"`**: las variables del contenedor (`APP_ENV=local`, `DATABASE_URL=…/ruta`) ganaban a las del XML, así que los tests no corrían contra `ruta_test`. Añadido `force="true"` a todas, y `cacheResult="false"` (el volumen montado no es escribible por `www-data`).
- **Volumen montado sin escritura para `www-data`**: la vista del 404 de Laravel no compilaba. `VIEW_COMPILED_PATH=/tmp/views` en `compose.yml`.
- **`docker/nginx/Dockerfile.dockerignore`** excluía `docker/` entero, incluidos los `.conf` que copia: el build fallaba. Ahora `docker/*` + `!docker/nginx`.
- No existía `backend/.env` y PHPUnit avisaba (phpdotenv). Paso de instalación estándar: `cp backend/.env.example backend/.env` (ignorado por git; `environment:` de compose manda sobre él).
- Pendiente, sin tocar (decisión de paridad para la fase 4): `ApiJson::ENCODE_FLAGS` lleva `JSON_PRESERVE_ZERO_FRACTION` y `ApiJsonTest` fija `"n":0.0`, pero `JSON.stringify(0.0)` da `0`. Un float entero saldría distinto que en Node.

### Cierre de la fase con Docker (29.6.1)

1. `composer:2.10 install` (el tag existe; versiones sin cambios): `vendor/` completo.
2. `php artisan --version` → **Laravel Framework 13.40.0**.
3. `php artisan test` → **103 passed (365 assertions)**, 0 avisos, ~17 s (antes de los arreglos de esta sesión: 1 fallo y 31 avisos).
4. `--profile local up -d --build --wait`: todo `healthy`, `migrate` sale con 0. `curl -i :8081/healthz` → 200 `{"ok":true}`, `Content-Type: application/json`, `Cache-Control: no-store`; `/` y `/plan` → shell HTML `no-cache` con nosniff/Referrer-Policy/X-Frame-Options; `/api/deepseek` → 410 exacto.
5. Contrato contra Laravel (`--profile contract`; `BASE_URL=http://localhost:8081`, `CONTRACT_DATABASE_URL=…@localhost:5435/ruta`, `MAILPIT_URL=http://localhost:8027`, `FAKE_DEEPSEEK_URL=http://localhost:8791`): `health` 3/3, `deepseek` 5/5, `not-found` 6/6 **verdes**; `cors` 0/14 rojo, esperado: los 14 casos usan endpoints que aún no existen en Laravel (fase 4) y caen en el 404. Total 14/28.
6. Stack abajo (`down`). Contenedores ajenos (`reyco-*`) sin tocar; sin choques de puertos (5435/8027/8081/8791).

- Front: `npm test` 94/0, `npm run test:plan` correcto, `npm run check` 0/0/0.
- Tareas: 2.1, 2.2, 2.4–2.9 `[x]`. 2.3 queda `[ ]`: el contrato de health pasa contra Laravel, pero no se vio en rojo antes (el controlador ya existía). 2.10 sigue abierta: falta repetir la batería entera contra Node.
- Comandos de esta fase, ahora con `--env-file docker/local.env` (ver cabecera de `docker/compose.yml`).

## Punto de control 2.10 — 2026-11-05

- Batería de contrato entera contra Node (`npm run contract:up` → `npm run test:contract` → `npm run contract:down`): **195/195 verdes**, 0 fallos, ~4,8 s. Stack `ruta-contract-node` abajo.
- Contra Laravel (sesión anterior): `health` 3/3, `deepseek` 5/5, `not-found` 6/6 verdes; `cors` 0/14 rojo y anotado (todos sus casos usan endpoints de la fase 4).
- 2.3 se deja `[ ]` a propósito (contrato verde contra Laravel, nunca visto en rojo). No bloquea: el comportamiento lo cubren el contrato y `HealthControllerTest`.

## Fase 3 — Migraciones — 2026-11-05

Restricción del dueño (`.agentflow/DECISIONS.md`, 2026-11-05): migraciones solo en el Postgres local (`ruta`, `ruta_test`); ningún `fresh`/`refresh`/`reset`/`wipe`, `DROP`, `TRUNCATE`, `DELETE` ni `UPDATE`. Por eso 3.1 y 3.3 no usan una base recreada: todo ocurre en un esquema con nombre único (`parity_a_…`, `parity_b_…`, `adopt_…`) dentro de una transacción que se deshace (el DDL de Postgres es transaccional). El migrador de Laravel corre dentro de esa transacción (anida con savepoints) y `Schema::hasTable` mira `current_schema()`, que sigue al `set local search_path`. Redacción de 3.1 y 3.3 en `tasks.md` actualizada.

- 3.1 `SchemaParityTest` + `SchemaSandbox` (ayudante): compara tablas, columnas (tipo, precisión, nulo, defecto, orden), restricciones (`pg_get_constraintdef` y nombre), `indexdef` y secuencias, con el nombre del esquema sustituido por `<s>`. Excluye la tabla `migrations` y su secuencia. Rojo visto: esquema B vacío (sin migraciones). Un segundo caso comprueba que no queda ningún esquema `parity_*`/`adopt_*`.
- 3.2 Siete migraciones `2026_11_05_00000{1..7}`, una por tabla, guarda `Schema::hasTable`, `down()` vacío comentado. DDL literal de `schema.sql` en las siete (no solo donde el constructor no llega): el constructor da `timestamp(0)` por defecto, `CURRENT_TIMESTAMP` en vez de `now()`, `'0'` en los booleanos y nombres de restricción propios (`*_unique`, `*_foreign`) en vez de los de Postgres (`*_key`, `*_fkey`). Las `alter table … add column if not exists` no se repiten: `return_to` y `cost_micros` van en la creación. Verde a la primera; la única diferencia que salió fue la secuencia de `migrations` (ruido del test, excluida).
- 3.3 `AdoptionTest`: esquema creado con `schema.sql`, una fila en cada tabla, `php artisan migrate --force` → las siete registradas en el lote 1, descripción del esquema idéntica y recuento + `md5` de filas iguales. Escrito con las migraciones ya hechas; autocomprobación: sin la guarda de `users` falla con `relation "users" already exists`.
- 3.4 Nada que implementar para 3.3. `backend/database/README.md` con la regla "solo se añaden migraciones; las base no se tocan" y la lista de comandos prohibidos.
- 3.5 y 3.6 **[AUT]**: abiertas, no ejecutadas (Neon / producción).

### Hallado al verificar

- **PHPUnit corría contra `ruta`, no `ruta_test`** (y con `APP_ENV=local`): las variables del contenedor llegan en `$_SERVER`, que el repositorio de entorno de Laravel lee antes que `$_ENV`, y `<env force="true">` de PHPUnit solo toca `putenv` y `$_ENV`. Arreglo: `<server … force="true"/>` para `APP_ENV`, `DB_CONNECTION` y `DATABASE_URL` en `backend/phpunit.xml`. Test de guarda `tests/Feature/Database/TestDatabaseTest.php` (base `ruta_test`, entorno `testing`): rojo sin el arreglo, verde con él. Lo ejecutado antes en `ruta` no dejó nada (los tests de esta fase hacen `ROLLBACK`; los anteriores no escriben).
- `db/schema.sql` no estaba en el contenedor (solo se monta `backend/`). Añadido `../db:/var/www/db:ro` a los volúmenes de la API en `docker/compose.yml`; `base_path('../db/schema.sql')` lo encuentra. También lo necesitará `op=schema` de admin (b.9).

### Punto de control 3.7

- PHPUnit: **107 passed (392 assertions)** en `ruta_test` (103 + `SchemaParityTest` 2, `AdoptionTest` 1, `TestDatabaseTest` 1).
- `--profile local up -d --build --wait`: `migrate` sale con 0 y aplica las siete en la base local `ruta`; `/healthz` 200. Stack `ruta2` abajo. Contenedores `reyco-*` sin tocar.
- Front: `npm test` 94/0, `npm run test:plan` correcto, `npm run check` 0/0/0, `npm run build:fast` correcto.
### Corrección de revisión (code-review high) — 2026-11-05

- Hallazgo: la guarda `Schema::hasTable` saltaba la migración entera en una base existente; `schema.sql` cura las bases antiguas (`alter table … add column if not exists return_to` / `cost_micros`, `create index if not exists`), las migraciones no. Una base anterior a esas columnas (Neon puede serlo) quedaba marcada como migrada sin `return_to`, `cost_micros` ni índices.
- Test primero: `AdoptionTest::test_migrate_heals_a_legacy_database_like_schema_sql_does` — base antigua (`schema.sql` sin las dos `alter`, sin `cost_micros` en la creación y sin `ai_usage_ip_idx`; cada línea quitada se exige presente, así que si `schema.sql` cambia el test lo dice) con una fila en cada tabla; migrate debe dejarla con la misma descripción que `schema.sql` aplicado a otra base antigua, y recuento + `md5` de las columnas originales iguales. **Rojo** con las guardas: "Failed asserting that an array contains 'return_to'".
- Arreglo: sin guarda; cada migración repite las sentencias idempotentes de `schema.sql` en su orden (`create table if not exists`, `alter … add column if not exists`, `create index if not exists`). Solo añade. Docblocks y `backend/database/README.md` describen el mecanismo nuevo.
- `AdoptionTest` saca la lista de migraciones de `glob(database/migrations/*.php)` ordenado (y exige que sean siete). `SchemaSandbox` gana `applyLegacySchemaSql()` y `contentsOf(tabla, columnas)`.
- PHPUnit en `ruta_test`: **108 passed (432 assertions)**. `SchemaParityTest` sigue verde (orden de columnas incluido: `return_to` queda al final, como con `schema.sql`).

- Siguiente: 3.5 (comparación de solo lectura contra Neon) necesita al dueño; la fase 4 puede empezar sin ella, pero el plan dice que si 3.5 encuentra diferencias se paran las fases siguientes.

## Fase 4 — Contextos (lotes a, b, c) — 2026-11-06/07

Stack de contrato Laravel: `APP_URL=http://localhost:8080 API_ENV_FILE=../tests/contract/contract.env docker compose --env-file docker/local.env -f docker/compose.yml --profile contract up -d --build --wait` (`APP_URL` hay que exportarlo: el `environment:` de compose gana al `env_file` y el contrato espera `:8080`). Batería: `BASE_URL=http://localhost:8081 CONTRACT_DATABASE_URL=postgresql://ruta:ruta@localhost:5435/ruta MAILPIT_URL=http://localhost:8027 FAKE_DEEPSEEK_URL=http://localhost:8791 npm run test:contract`.

### Preparación
- `ruta_test` no tenía tablas (las fases 2–3 usan esquemas propios dentro de transacciones). Se aplicaron las siete migraciones con `php artisan migrate --force` contra `ruta_test` local (aditivo, autorizado). Los Feature nuevos usan `DatabaseTransactions`: no queda nada escrito.
- `phpunit.xml`: `LOG_CHANNEL=null` (env y server) y suite `Golden`.

### Lote a — Auth + cuota (a.1–a.12 hechas)
- Rojo visto: contratos `auth-request`, `auth-verify`, `auth-session`, `quota` 0/49 contra Laravel; después **49/49**.
- Paridad: `ApiJson` sin `JSON_PRESERVE_ZERO_FRACTION` (`JSON.stringify(0.0)` es `0`; `ApiJsonTest` cambiado primero, rojo → verde). `Shared\Domain\JsString` (`String()`, `trim()`, `.length`, `.slice()` de JS) y `JsNumber` (`num()`, `Number()`); `DeviceId` y `JsonBody` los reutilizan.
- `backend/tests/fixtures/login-email.json` generado con `_mail.mts` real: `MAIL_PROVIDER=resend MAIL_FROM= node --experimental-strip-types --input-type=module -e '…'` sustituye `fetch`, llama a `sendLoginLink` con dos `{link, minutes}` y guarda `{link, minutes, subject, text, html, from}` de lo que iría a Resend.
- a.10, concurrencia: la carrera con dos conexiones necesita filas confirmadas y el `update … ok = false` de la perdedora sobre una fila confirmada; las reglas de datos no lo permiten. Se reproduce de forma determinista en una transacción: un listener de consultas mete la fila de la otra petición justo después de nuestro `insert` y antes de la segunda comprobación → perdemos, nuestra fila queda `ok=false` y se cobra 15/15. Si el dueño quiere la carrera real, hace falta una base desechable.
- Los `.catch(() => {})` de Node (marca de uso de la sesión, limpieza de enlaces caducados, coste real al final del stream, anular tras un rechazo del proveedor) se registran en el log en vez de tragarse.

### Lote b — Progress, Library, Pulse, Admin (b.1–b.10 hechas; b.11 `[~]`)
- Rojo visto: 80/87 al empezar.
- b.2: `scripts/exportar-contenido.mts` + `npm run content:export` → `backend/resources/content/{tracks,a2b1,b1b2}.json` (en `.gitignore`); `tests/exportar-contenido.test.mts` rojo → verde. Laravel lee las rutas válidas de `tracks.json` (`ContentTracks`; si falta, error claro al primer uso). **Pendiente**: los Dockerfile aún no ejecutan la exportación (en el stack local funciona porque `backend/` va montado).
- b.5: `scripts/exportar-prompts.mts` genera `sanitize.json` (y desde c.1 `prompts.json`); `tests/fixtures-frescas.test.mts` rojo → verde.
- Contratos: `progress` 24/24, `readings` 33/33, `pulse` 9/9; `admin` + `client-ip` + `body-limits` + `cors`: 97/101, los 4 rojos llamaban a `/api/ai/chat`.
- Rarezas fijadas: `personas` de admin es bigint (Node: cadena; PDO: entero) → cadena en `AdminQueries::usageByDay`. Un `?after=` que no es fecha hace fallar la consulta → 500 `server_error`, como Node.
- `op=cleanup-test` del contrato borra filas de prueba (`@smoke.test`, `smoke-%`, `Smoke…`) de la base `ruta` del Docker local: es el comportamiento del endpoint, no un borrado a mano. En PHPUnit va dentro de una transacción que se deshace.

### Lote c — IA (c.1–c.6 hechas; c.7 `[~]`)
- `PromptsGoldenTest` (35 casos de `buildMessages` + `isKind`) rojo → verde; `StreamChatTest` (10) y `ChatEndpointTest` (8) rojo → verde con `FakeChatModel`.
- Encontrado: `StreamedResponse::setContent(null)` marca la respuesta como enviada y el cuerpo salía vacío; `ApiStreamedResponse` (cabeceras tal cual con `RawHeaderBag`, extraída de `ApiResponse`) desmarca `streamed` como hace Symfony.
- nginx se queda las `X-Accel-*` del upstream y `X-Accel-Buffering: no` no llegaba: `fastcgi_pass_header X-Accel-Buffering;` en `docker/nginx/fastcgi-api.conf`. **Sin verificar**: Docker Desktop se cayó al reconstruir `web`.
- Contrato `ai-chat` antes de esos dos arreglos: 27/31. Sin volver a ejecutar.

### Seguridad (revisión 2026-11-07)
1. `AdminRequest` acepta el token por `?token=`: lo hace Node, lo usa `public/admin.html:74` y lo fija el contrato `admin.test.mts`. Se mantiene por paridad. Propuesta posterior: `admin.html` con `Authorization: Bearer`, quitar la rama de query (test primero) y cambiar el contrato en la misma tarea.
2. `MailLoginLinkSender`: el proveedor `log` (y MAIL_PROVIDER sin definir, cuyo defecto es `log`) falla fuera de local/testing (`RuntimeException` → 502 `mail_failed`) sin escribir el enlace. Diferencia deliberada con Node. Test `MailLoginLinkSenderTest::test_log_provider_fails_closed_outside_local_and_testing`, escrito antes; **sin ejecutar** (Docker caído; el PHP local no tiene mbstring).

### Conflictos con landing-y-acceso (no se cambia nada aquí)
- AC-21: la IA exigirá sesión → la cuota anónima (`anon_limit`, `QUOTA_ANON_*`) y `/api/ai/chat` sin cuenta dejan de usarse; hoy se portan por paridad.
- AC-22: sin clave propia → los mensajes «usa tu propia clave en Ajustes» de la cuota quedan obsoletos; se cambian con su contrato en esa feature.

### CP 4.C — sin cerrar (2026-11-07)
- PHPUnit: última pasada completa (tras el lote a) 261/261; después, por partes, todo verde. Falta la pasada completa con `run --rm`.
- Front: `npm test` 105/105, `npm run test:plan` correcto, `npm run check` 0/0/0. `tests/contract/` sin cambios.
- Pendiente con Docker: PHPUnit completo, batería entera contra Laravel y contra Node, verificar `X-Accel-Buffering` y el test de `log`, parar los stacks.

### Revisión de código — 2026-11-07 (con Docker de vuelta)
- **Alta**: consumir el enlace mágico era un `select` y un `update` separados (dos verificaciones simultáneas abrían dos sesiones). Ahora `AuthRepository::consumeLoginToken` hace `update … set used_at = now() where token_hash = ? and used_at is null and expires_at > now() returning email, return_to`. Tests (rojo → verde): segundo consumo → null; caducado → null y sin marcar.
- Cabeceras en Latin-1 como Node («día» → `d\xEDa`) en `RawHeaderBag::set` para toda la API; fuera el caso suelto de `ChatController`. `RawHeaderBagTest` rojo → verde.
- `ChatStream`: se lee lo que queda en el búfer al acabar (un `usage` final sin `\n` se cobraba al precio estimado). Test rojo → verde.
- `AdminQueries::deleteSmokeData`: quitado el `delete` de `ai_usage` con `kind = 'test'`, contenido en el siguiente (`device_id like 'smoke-%'`); ningún contador lo usa.
- **No hecho**: mandar `deepseek-flash` al proveedor (DECISIONS 2026-11-05). El contrato congelado `ai-chat.test.mts` (líneas 123, 141, 153) exige que al proveedor llegue `deepseek-chat` / `deepseek-reasoner`, y la decisión no dice cómo pedir el razonamiento a `deepseek-flash`. Decide el dueño: o se cambia el contrato (y Node) en una tarea propia, o se deja para el corte.
- PHPUnit (`run --rm`, `ruta_test`): **376/376**. Contrato contra Laravel, todos los archivos salvo `admin` (borra filas de `ruta` con `op=cleanup-test`; sin autorización en esta sesión): **186/186**, incluido `X-Accel-Buffering` a través de nginx.

### Cambio de contrato por landing-y-acceso (AC-21) — 2026-11-07
- `/api/ai/chat` exige sesión: 405 → sesión (401/403) → cuerpo. Contrato `ai-chat.test.mts` cambiado junto con Node (`ai-chat.mts`) y Laravel (`ChatController` + `ChatEndpointTest`). Detalle en `specs/landing-y-acceso/progress.md`, fase 2. El cupo anónimo deja de usarse en el chat; su código de cuota se queda (K-13).
