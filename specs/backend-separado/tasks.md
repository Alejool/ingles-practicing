# Backend separado — Tareas (Laravel hexagonal)

Leyenda: `[ ]` pendiente · `[~]` en curso · `[x]` hecha · `[P]` paralelizable con las otras `[P]` de su fase (archivos disjuntos) · `[C]` punto de control · **[AUT]** necesita autorización humana explícita antes de ejecutarse (movimientos, borrados, migraciones en una base que no es la de test, gasto real).

Reglas:
- Backend: cada pieza es "Test (falla primero)" → "Implementar". Unit (Domain, sin base) en `backend/tests/Unit`; Feature contra Postgres (`ruta_test`) en `backend/tests/Feature`. Todo se ejecuta en Docker: `docker compose -f docker/compose.yml run --rm api php artisan test`.
- Contrato: los tests de la fase 1 son de **caracterización** (verdes contra Node al escribirse). Su "rojo primero" es contra Laravel, al empezar cada lote de la fase 4.
- Desde el punto de control 1.13 **la API Node está congelada**: cualquier cambio en `netlify/functions/` actualiza en la misma tarea el contrato y el PHP.

Comandos de cada punto de control:
- `npm test`, `npm run check`, `npm run test:plan`, `npm run build:fast` (front, en la raíz hasta la fase 6)
- `docker compose -f docker/compose.yml run --rm api php artisan test` (a partir de la fase 2)
- `BASE_URL=… npm run test:contract` contra Node (`:8080`) y, desde la fase 4, contra Laravel (`:8081`)

## Fase 0 — Requisitos previos

- [x] 0.1 Comprobar que `selector-de-ruta` está cerrado y que `ruta-b2-c1` fases 1 y 2 (cambios en `pulse.mts`, `progress.mts`, `readings.mts`) y `tutor-contextual` están en un punto de control, sin trabajo a medias sobre `netlify/functions/`. Si no, esta feature espera.
  - Archivos: `specs/backend-separado/progress.md`.
- [x] 0.2 Línea base: `npm test`, `npm run test:plan`, `npm run build:fast`, y `docker compose up` de la raíz con `/healthz` 200. Anotar resultados.
- [x] 0.3 [C] Punto de control: línea base anotada en `progress.md`.

## Fase 1 — Contratos HTTP contra la API Node (antes de cualquier PHP)

- [x] 1.1 Infraestructura de contrato: `tests/contract/_lib.mts` (BASE_URL, `pedir()`, login vía Mailpit, consultas `pg` de solo lectura, IP y dispositivo únicos por test, regex ISO), `tests/contract/fake-deepseek.mts` (modos `ok`, `lento`, `402`, `500`, `caido`, `sin_uso`, elegidos por el texto del payload), `tests/contract/contract.env`, script raíz `test:contract`, y un `compose` de contrato que levanta la imagen Node actual con ese entorno + Mailpit + simulado. Verificación: un test trivial pasa contra `:8080`.
  - Archivos: `tests/contract/_lib.mts`, `tests/contract/fake-deepseek.mts`, `tests/contract/contract.env`, `docker/compose.contract-node.yml`, `package.json` (solo el script).
- [x] 1.2 [P] Contrato: `/healthz` (200, forma, cabeceras exactas, sin CORS), `/api/deepseek` (410 con cualquier método incluido `OPTIONS`), `/api/xyz` 404 `not_found`, `OPTIONS` en cada endpoint con preflight (204, las cinco cabeceras CORS exactas, `Vary: Origin`), origen permitido/no permitido con `ALLOWED_ORIGINS`. Ninguna respuesta lleva `Set-Cookie`.
  - Archivos: `tests/contract/health.test.mts`, `deepseek.test.mts`, `not-found.test.mts`, `cors.test.mts`.
- [x] 1.3 [P] Contrato: `/api/auth/request` — 405, cuerpo > 4096 → 413, JSON inválido → 400, `bad_email` (casos de `normaliseEmail`), 200 con `{ok, minutes, delivery, mailboxUrl}`, fila en `login_tokens` con `return_to` según `Origin` (permitido, localhost con `APP_URL` local, ajeno → null), `too_many_links` a la 5.ª petición por correo en una hora.
  - Archivos: `tests/contract/auth-request.test.mts`.
- [x] 1.4 [P] Contrato: `/api/auth/verify` — sin token → 302 `#auth=error`; token inválido/usado/caducado → `#auth=expired`; válido → `#auth=<token>` con base `return_to` o `APP_URL`, `used_at` puesto, usuario creado una vez, sesión creada; sin cuerpo, `Cache-Control: no-store`, sin CORS. `/api/auth/session` — GET anónimo (`user:null`, `quota` de anónimo, `accounts`), GET con sesión, POST cierra la sesión (la fila desaparece y el token deja de valer).
  - Archivos: `tests/contract/auth-verify.test.mts`, `auth-session.test.mts`.
- [x] 1.5 [P] Contrato: `/api/quota` — forma exacta de `quota` para anónimo y con cuenta (`window`, `resetsAt`, `monthlyUsed`, `monthlyLimit`, `globalRemaining`, `spentTodayUsd`, `budgetUsd`), orden de claves de nivel superior.
  - Archivos: `tests/contract/quota.test.mts`.
- [x] 1.6 [P] Contrato: `/api/ai/chat` — 405; `bad_kind`; `bad_payload`; 413 a > 96 KB; stream: cuerpo byte a byte igual al emitido por el simulado, cabeceras SSE y `X-Quota-*` (con el "- 1" actual); fila `ai_usage` reservada y luego con tokens y coste real; proveedor `402` → 502 `provider_no_credit` y fila `ok=false`; `500` → `provider_error`; `caido` → `provider_error` y fila anulada; `too_fast` a la 7.ª llamada del mismo dispositivo en un minuto; anónimo sin créditos → 402 `anon_limit` con `quota`; con cuenta → 429 `user_daily_limit`; el modelo pedido fuera de lista → `deepseek-chat` en la petición al simulado; `temperature` 0 solo en `test`.
  - Archivos: `tests/contract/ai-chat.test.mts`.
- [x] 1.7 [P] Contrato: `/api/progress` — sin sesión 401 (también con método no permitido); GET vacío; PUT crea (versión 1); PUT con versión vieja → 409 con `server`; PUT correcto → versión +1; `data` no objeto → 422; `version` como cadena cuenta como 0; un `data` con `{}`, `[]`, `0.0`, acentos y `/` vuelve idéntico; `updatedAt` con formato ISO de milisegundos; > `PROGRESS_MAX_KB` → 413.
  - Archivos: `tests/contract/progress.test.mts`.
- [x] 1.8 [P] Contrato: `/api/readings` — GET por ruta (ruta desconocida → `b1b2`), `after`, ocultas excluidas, `Cache-Control: public, max-age=120`; POST sin sesión → 401 con el mensaje propio; validación (párrafos, preguntas, 4 opciones, `a`, `e` no texto, > 1500 palabras, id inválido) con sus mensajes; `e` saneada al guardar; id duplicado no sobrescribe; `?id=&read=1` suma una lectura sin sesión.
  - Archivos: `tests/contract/readings.test.mts`.
- [x] 1.9 [P] Contrato: `/api/pulse` — 405; sin dispositivo `{ok:true}` sin fila; con dispositivo: fila con `anon` = sha256(dev\|pulse\|pimienta), valores recortados a sus rangos, módulos fuera de lista descartados, segunda llamada del día con `greatest`.
  - Archivos: `tests/contract/pulse.test.mts`.
- [x] 1.10 [P] Contrato: `/api/admin` — sin token / token erróneo → 403; token por query y por bearer; GET con las claves y tipos del informe; `op=hide` (sin id 422 `bad_id`, id inexistente 404, ocultar y volver a mostrar); `op=schema` → `{ok, message}` con el número de sentencias; `op=cleanup-test` borra solo lo de `@smoke.test` / `smoke-%` y devuelve los contadores.
  - Archivos: `tests/contract/admin.test.mts`.
- [x] 1.11 [P] Contrato: IP del cliente (AC-9) — con `TRUST_PROXY=1`, `X-Forwarded-For: falsa, real` cuenta como `real`; `X-Nf-Client-Connection-Ip` y `X-Vercel-Forwarded-For` no cambian el `ip_hash` guardado.
  - Archivos: `tests/contract/client-ip.test.mts`.
- [x] 1.12 [P] Contrato: cuerpo > 2 MB → 500 `server_error` (comportamiento de `server/index.mts`).
  - Archivos: `tests/contract/body-limits.test.mts`.
- [x] 1.13 [C] Punto de control: la batería entera en verde contra Node **dos veces seguidas** (sin tests inestables); número de tests anotado; se declara congelada la API Node (nota en `specs/ORDEN.md` por la tarea 6.5 o antes si hace falta).

## Fase 2 — Proyecto Laravel y Docker

- [~] 2.1 Crear `backend/` con `laravel/laravel` 13.11.0 dentro de un contenedor `composer:2`; fijar `laravel/framework` 13.40.0 y `phpunit/phpunit` 12.5.43 (la del esqueleto; aprobado en el punto de control 1); borrar del proyecto nuevo las migraciones, vistas y rutas web del esqueleto (`users`, `password_reset_tokens`, `sessions`, `cache`, `jobs`); `SESSION_DRIVER=array`, `CACHE_STORE=array`, `QUEUE_CONNECTION=sync`; autoload PSR-4 `Ruta\\` → `src/`; `composer.lock` versionado. Verificación: `php artisan --version` = 13.40.0 en el contenedor.
  - Archivos: `backend/**` (nuevo).
- [~] 2.2 Docker: `docker/php/{Dockerfile, php.ini, www.conf}` (8.4.22-fpm-alpine, `pdo_pgsql`, `opcache`, `max_execution_time=0`, `output_buffering=Off`, `expose_php=Off`, `post_max_size=3M`), `docker/nginx/{Dockerfile, default.conf}` (etapa node que construye el front y exporta contenido; estáticos con las cabeceras del plan; `/api/` y `/healthz` a fpm sin búfer; `client_max_body_size 3m`; `fastcgi_read_timeout 600s`), `docker/compose.yml` (web, api, db, mailpit con tag fijo, `migrate` de un solo uso en perfiles `local`/`contract`, `fake-deepseek` en perfil `contract`). Verificación: `docker compose -f docker/compose.yml up` sirve el front en `:8081`.
  - Archivos: `docker/**`.
- [ ] 2.3 Test (falla primero): contrato `health.test.mts` contra `:8081` (falla: 404).
- [~] 2.4 Implementar: `HealthController` y su línea en `routes/api.php` (ruta `/healthz` fuera del prefijo `api`). El contrato de health pasa contra Laravel.
  - Archivos: `backend/app/Http/Controllers/HealthController.php`, `backend/routes/api.php`, `backend/bootstrap/app.php`.
- [~] 2.5 Test: arquitectura. `DomainIsFrameworkFreeTest` (recorre `src/*/Domain/**/*.php`: ni `Illuminate\`, ni `Laravel\`, ni `App\`, ni fachadas) y `AppendOnlyTest` (busca `update`/`delete` sobre tablas declaradas solo-inserción; de momento lista vacía). Cada uno con un caso de autocomprobación que demuestra que detecta una violación (archivo de ejemplo en `tests/fixtures/`).
  - Archivos: `backend/tests/Architecture/*.php`, `backend/tests/fixtures/architecture/*`.
- [~] 2.6 Test (falla primero): `JsonBody` (vacío → `{}`, `null`, inválido → `bad_json` 400, tope en unidades UTF-16 con un texto de emojis y acentos, objetos vacíos se conservan), `ApiJson` (cabeceras CORS por origen permitido/ajeno/`*`, `Content-Type` con charset, `no-store`), `ErrorMap` (código → estado; desconocido → 500 `server_error` "Error interno").
  - Archivos: `backend/tests/Unit/Http/*.php`.
- [~] 2.7 Implementar: `JsonBody`, `ApiJson`, `ErrorMap`, middleware `Cors` (preflight 204) y `BodyLimit` (> 2 MB → 500), manejador de excepciones (`DomainError` → JSON de error con CORS; cualquier otra → 500 y log sin cuerpo), fallback `/api/*` → 404 `not_found` sin CORS, `GoneController`; se quita `HandleCors`.
  - Archivos: `backend/app/Http/**`, `backend/bootstrap/app.php`, `backend/routes/api.php`.
- [~] 2.8 Test (falla primero): `Shared\Domain` — `ClientIp::fromProxy` con los casos de `tests/client-ip.test.mts`; `Hashing::sha256Hex`, `hashIp` y `anonPulse` iguales a valores calculados con el código Node (fixture); `randomToken` (43 caracteres base64url); `DeviceId`; `IsoInstant::fromPg` (UTC, ms, `Z`).
  - Archivos: `backend/tests/Unit/Shared/*.php`, `backend/tests/fixtures/hashes.json` (generado por un script Node de una línea, documentado en el test).
- [~] 2.9 Implementar: `Shared\Domain\{DomainError, Clock, ClientIp, Hashing, DeviceId, IsoInstant}`, `Shared\Infrastructure\SystemClock`.
- [ ] 2.10 [C] Punto de control: PHPUnit verde; contratos `health`, `deepseek`, `not-found`, `cors` (solo preflight de rutas ya existentes) verdes contra Laravel; el resto rojo y anotado; batería verde contra Node.

## Fase 3 — Migraciones

- [ ] 3.1 Test (falla primero): `SchemaParityTest` — base A desde `db/schema.sql` (con `psql` en el contenedor), base B con `migrate:fresh`; columnas (tipo, nulo, defecto), restricciones e `indexdef` idénticos.
  - Archivos: `backend/tests/Feature/Database/SchemaParityTest.php`.
- [ ] 3.2 Implementar: siete migraciones `2026_11_05_000001…7` (`users`, `login_tokens`, `sessions`, `ai_usage`, `progress`, `shared_readings`, `pulse`), una por tabla, cada una con guarda `Schema::hasTable` y `down()` vacío comentado; DDL literal donde el constructor no llega.
  - Archivos: `backend/database/migrations/*.php`.
- [ ] 3.3 Test: adopción — sobre una base creada con `schema.sql` y con filas en todas las tablas, `php artisan migrate` registra las siete como ejecutadas, no cambia el esquema (mismo resultado de 3.1) y deja recuentos y sumas de comprobación de filas iguales.
  - Archivos: `backend/tests/Feature/Database/AdoptionTest.php`.
- [ ] 3.4 Implementar lo que falte para 3.3 (si algo falla) y documentar en `backend/database/README` la regla "solo se añaden migraciones; las base no se tocan".
- [ ] 3.5 **[AUT]** Comparación de solo lectura contra Neon: `pg_dump --schema-only` (o las consultas del test 3.1) contra producción y diff con la base A. Lo ejecuta el dueño o se ejecuta con su OK; resultado en `progress.md`. Si hay diferencias, se paran las fases siguientes y se decide.
- [ ] 3.6 **[AUT]** (Se ejecuta en el despliegue, no en esta feature.) `php artisan migrate --force` contra producción crea la tabla `migrations` y marca las siete. Queda escrito en `DESPLIEGUE.md` como paso con autorización.
- [ ] 3.7 [C] Punto de control: comandos; `SchemaParityTest` y `AdoptionTest` verdes.

## Fase 4 — Contextos en tres lotes paralelos

Los lotes a, b y c tocan archivos disjuntos salvo `routes/api.php` y `AppServiceProvider` (una línea cada uno; se fusionan a mano). La integración final de c (endpoint de chat) necesita `ReserveCredits` de a (tarea a.12).

### Lote a — Auth + cuota

- [ ] a.1 [P] Test (falla primero): contrato `auth-request`, `auth-verify`, `auth-session`, `quota` contra Laravel (rojos). Sin cambiar aserciones.
- [ ] a.2 [P] Test (falla primero): `Auth\Domain\Email::fromRaw` (casos de `normaliseEmail`, mensaje exacto) y `ReturnTo` (casos de `safeReturnTo`: `APP_URL`, `ALLOWED_ORIGINS`, localhost con `APP_URL` local, ajeno, basura).
- [ ] a.3 [P] Implementar: `Email`, `ReturnTo`.
- [ ] a.4 [P] Test (falla primero): `LoginEmail` igual al fixture generado desde `_mail.mts` (asunto, texto, HTML); `MailLoginLinkSender` elige proveedor (`log` escribe el enlace en el log igual que hoy —proveedor solo de desarrollo; se señala a seguridad en 5.2—, `smtp` construye el DSN con `SMTP_*`, `resend`/`postmark` con `Http::fake`), `deliveryMode`.
  - Archivos: `backend/tests/Unit/Auth/*.php`, `backend/tests/fixtures/login-email.json`.
- [ ] a.5 [P] Implementar: `LoginLinkSender` (puerto), `MailLoginLinkSender`, `LoginEmail`.
- [ ] a.6 [P] Test (falla primero) Feature: `RequestLoginLink` (orden de errores, límites por hora, `accounts_off`, `mail_failed`, limpieza oportunista), `VerifyLoginLink` (las tres salidas, upsert, sesión con `SESSION_DAYS`), `ResolveSession` (bloqueado 403, actualiza `last_used_at`/`last_seen_at` sin bloquear), `Logout`.
- [ ] a.7 [P] Implementar: casos de uso de Auth, `AuthRepository`, `RequestLinkRequest`, controladores `RequestLinkController`, `VerifyLinkController`, `SessionController`, rutas.
- [ ] a.8 [P] Test (falla primero): `Ai\Domain` — `Pricing::costeMicros` (modelo desconocido al más caro), `QuotaLimits` (lectura de env con defectos), `QuotaPolicy::creditosDe`, `creditosEstimados`, y `QuotaPolicy::check(medidas…)` con todos los mensajes de `comprobar()` (ritmo, global por créditos y por dinero, usuario diario/mensual, anónimo con/sin cuentas y ventana diaria). Casos de `tests/quota.test.mts` que no necesitan base.
- [ ] a.9 [P] Implementar: `Pricing`, `QuotaLimits`, `QuotaPolicy`, `QuotaState`.
- [ ] a.10 [P] Test (falla primero) Feature: `ReserveCredits` y `ReadQuota` con Postgres — casos de base de `tests/quota.test.mts`; dos reservas simultáneas con cuota para una (dos conexiones PDO intercaladas o dos procesos) → como mucho una pasa; la perdedora queda `ok=false`; `anular`.
- [ ] a.11 [P] Implementar: `AiUsageRepository` (SQL literal de `_quota.mts`), `ReserveCredits` (comprobar sin escribir → insertar → comprobar contando la propia; acepta un número de créditos explícito para el harness y, por defecto, `creditosEstimados`), `ReadQuota`, `SettleUsage`.
- [ ] a.12 [P] Implementar: `QuotaController` y ruta. Contratos `auth-*` y `quota` verdes contra Laravel.

### Lote b — Progress + Library + Pulse + Admin

- [ ] b.1 [P] Test (falla primero): contratos `progress`, `readings`, `pulse`, `admin`, `client-ip`, `body-limits` contra Laravel (rojos).
- [ ] b.2 [P] Exportación de contenido: test `node:test` (falla primero) de `scripts/exportar-contenido.mts` — `tracks.json` con los ids de `TRACK_META`; `<ruta>.json` con unidades, mazos, lecturas, escucha, días y referencias de ítems; determinista (dos ejecuciones, mismo resultado). Implementar el script y el script npm `content:export`. Sin tocar `src/data/`.
  - Archivos: `scripts/exportar-contenido.mts`, `tests/exportar-contenido.test.mts`, `package.json` (script), `.gitignore`.
- [ ] b.3 [P] Test (falla primero) Feature: `GetProgress`/`PutProgress` (todos los casos del contrato 1.7, más conservación de `{}` y `IsoInstant`).
- [ ] b.4 [P] Implementar: `ProgressRepository`, `GetProgress`, `PutProgress`, `PutProgressRequest`, `ProgressController`, ruta.
- [ ] b.5 [P] Test (falla primero): `Library\Domain\ReadingValidator` (casos de `tests/readings-validar.test.mts`), `PublishableId`; `Shared\Domain\HtmlSanitizer` igual a `fixtures/sanitize.json` generado desde `shared/sanitize.ts` (con su generador y un test `node:test` de frescura).
  - Archivos: `backend/tests/Unit/Library/*.php`, `backend/tests/Golden/SanitizeGoldenTest.php`, `backend/tests/fixtures/sanitize.json`, `scripts/exportar-prompts.mts` (genera también `sanitize.json`), `tests/fixtures-frescas.test.mts`.
- [ ] b.6 [P] Implementar: `HtmlSanitizer`, `ReadingValidator`, `PublishableId`, `ReadingsRepository`, casos de uso, `PublishReadingRequest`, `ReadingsController`, ruta.
- [ ] b.7 [P] Test (falla primero): `Pulse\Domain\Beat` (rangos, módulos, rutas desde `tracks.json`) y Feature de `RecordBeat` (`PULSE_ENABLED=false`, sin dispositivo, upsert con `greatest`).
- [ ] b.8 [P] Implementar: `Beat`, `PulseRepository`, `RecordBeat`, `RecordBeatRequest`, `PulseController`, ruta.
- [ ] b.9 [P] Test (falla primero) Feature: admin — sin `ADMIN_TOKEN` 404; token erróneo 403; informe con claves y tipos (`usd` cadena); `op=hide`; `op=schema` aplica `schema.sql` (ruta configurable; hoy la raíz) y cuenta sentencias igual que `migrate()` de `_db.mts`; `op=cleanup-test`; `/healthz` 503 con la base caída.
- [ ] b.10 [P] Implementar: `AdminQueries` (SQL literal), casos de uso de Admin, `AdminRequest`, `AdminController`, ruta.
- [ ] b.11 [P] Contratos `progress`, `readings`, `pulse`, `admin`, `client-ip`, `body-limits` verdes contra Laravel.

### Lote c — IA: prompts y chat SSE

- [ ] c.1 [P] Fixtures de prompts: `scripts/exportar-prompts.mts` ejecuta `buildMessages` sobre la matriz (cada `kind`, topes justos y pasados, recortes, `PayloadError` con su mensaje, modos de tutor, `reading` con `avoid`) y escribe `backend/tests/fixtures/prompts.json`; el test de frescura de b.5 cubre también este fichero.
- [ ] c.2 [P] Test (falla primero): `PromptsGoldenTest` — `PromptBuilder::build(kind, payload)` igual al fixture en cada caso; `AiKind::isKind`.
- [ ] c.3 [P] Implementar: `Ai\Domain\{AiKind, PromptBuilder, PayloadError}`.
- [ ] c.4 [P] Test (falla primero): `StreamChat` con `FakeChatModel` — pasa los trozos sin cambiar un byte; lee `usage` de líneas partidas entre trozos; al terminar llama a `SettleUsage` con el coste real (y no si no hubo `usage`); error de conexión → anula y `provider_error`; no OK → anula, 402 → `provider_no_credit`; cuerpo de la petición al modelo (`stream`, `stream_options`, `temperature` 0 solo en `test`, `max_tokens = min(AI_MAX_TOKENS, 4096)`).
- [ ] c.5 [P] Implementar: `ChatModel` (puerto), `DeepSeekClient` (Guzzle con `stream: true`, `connect_timeout` 10 s, sin tiempo total; solo HTTP), `StreamChat`.
- [ ] c.6 Test (falla primero) Feature: `ChatController` — cabeceras SSE y `X-Quota-*` (con "- 1"), orden de errores, reserva antes de llamar; depende de a.11.
- [ ] c.7 Implementar: `ChatRequest`, `ChatController` (`StreamedResponse`, `flush()` por trozo), ruta. Contrato `ai-chat` verde contra Laravel, incluido "el primer trozo llega antes de que el simulado termine" a través de nginx.

- [ ] 4.C [C] Punto de control de la fase 4: PHPUnit verde; batería de contrato entera verde contra Laravel y contra Node; `git diff` de `tests/contract/` desde 1.13 vacío (o solo cambios en `_lib.mts` justificados en `progress.md`).

## Fase 5 — Paridad completa y revisión

- [ ] 5.1 Test: `cross-compat.test.mts` — Node y Laravel contra **la misma base**: sesión creada en uno vale en el otro; `ip_hash` y `anon` idénticos para la misma IP y dispositivo; progreso escrito por uno lo lee el otro con la misma versión; una reserva de uno cuenta en la cuota del otro.
  - Archivos: `tests/contract/cross-compat.test.mts`, `docker/compose.contract-both.yml`.
- [ ] 5.2 Revisión de seguridad del backend (`/security-review` + agente `security` + skill `claude-security`): auth, cuota, admin, entrada, SSE, logs sin tokens. Hallazgos altos vuelven a su tarea.
- [ ] 5.3 Revisión de código (`/code-review`, `/simplify`) del backend. Hallazgos altos vuelven a su tarea.
- [ ] 5.4 Documentación del stack nuevo: `backend/.env.example` (todas las variables con su comentario), sección nueva en `DESPLIEGUE.md` (VPS, `FPM_MAX_CHILDREN`, `TRUST_PROXY`, `ALLOWED_ORIGINS`, migración con autorización, corte y vuelta atrás). Lo de Node se queda hasta la fase 6.
- [ ] 5.5 [C] Punto de control: todo verde dos veces; anotar en `progress.md`; **pedir autorización para la fase 6** (retirada y movimientos).

## Fase 6 — Retirar Node y mover el front (todo [AUT])

- [ ] 6.1 **[AUT]** Borrar: `netlify/`, `server/index.mts`, `api/`, `vercel.json`, `netlify.toml`, `Dockerfile`, `docker-compose.yml`, `tests/{quota,client-ip,readings-validar}.test.mts`, `scripts/backup.mts` (sustituido por `start.sh backup` con `pg_dump`), y las dependencias de servidor de `package.json`. Verificación: `npm test`, `npm run build:fast`, contrato contra Laravel.
- [ ] 6.2 **[AUT]** Commit solo de movimientos (`git mv`, sin cambios de contenido) según el mapa del plan: `src/`, `public/`, `astro.config.mjs`, `tsconfig.json`, `shared/`, scripts del front y tests de cliente → `frontend/`; `db/schema.sql` → `backend/database/schema.sql`. Verificación: `git log --follow` de un archivo de cada grupo.
- [ ] 6.3 **[AUT]** Commit de ajustes: `frontend/package.json` y raíz mínima (`test:contract`, `test:all`), `frontend/.env.example`, rutas en `docker/nginx/Dockerfile`, ruta de `schema.sql` en `config/ruta.php`, rutas de los generadores de fixtures y contenido. Verificación: todos los comandos de punto de control con las rutas nuevas.
- [ ] 6.4 Documentación (AC-23): `README.md`, `DESPLIEGUE.md` (sin Netlify ni Vercel), `start.sh` (levanta `docker/compose.yml`; `test` corre contrato + smoke), `desplegar.sh`.
- [ ] 6.5 **[AUT]** Actualizar rutas en las `tasks.md` pendientes de `tutor-contextual`, `ruta-b2-c1`, `selector-de-ruta` y en `specs/ORDEN.md` (y anotar en TUT que su servidor va en `backend/src/Ai`).
- [ ] 6.6 [C] Punto de control final: front (`npm test`, `check`, `test:plan`, `build`), back (PHPUnit), contrato contra el stack `docker/`, smoke con DeepSeek simulado; criterios del spec revisados uno a uno en `progress.md` (con los "Cambios respecto al spec" del plan); `master` intacto.

## Tareas que necesitan autorización humana

3.5 (lectura de esquema de producción), 3.6 (migrar producción, en el despliegue), 5.5 (paso a la fase 6), 6.1 (borrados), 6.2 (movimientos), 6.3 (commit de ajustes tras mover), 6.5 (editar specs ajenas). Además, cualquier `docker compose`/`composer`/`npm install` lo ejecuta quien implemente, no esta fase de planificación.
