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
