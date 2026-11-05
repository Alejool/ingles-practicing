# Backend separado — Plan técnico (Laravel hexagonal)

Fuente funcional: `specs/backend-separado/spec.md`. Decisión vinculante: `.agentflow/DECISIONS.md`, entrada "Backend en Laravel hexagonal" (2026-11-05), que **sustituye** el servidor Node/TS del spec. Donde el spec dice Node, este plan lo reinterpreta para Laravel y lo lista en "Cambios respecto al spec". ADR: `docs/adr/0001-backend-laravel-hexagonal.md`.

Principio de diseño de este plan: **lo mínimo que sea correcto**. La robustez viene de validar en el borde, invariantes explícitas en el dominio, escrituras idempotentes, tiempos acotados y tests de contrato; no de capas.

## Technical Approach

1. **Primero el contrato, después el PHP.** Una batería de tests HTTP independientes del lenguaje (`tests/contract/*.test.mts`, `node:test` + `fetch`, sin dependencias nuevas salvo `pg`, que ya está) se escribe y se pone **en verde contra la API Node actual** (`server/index.mts` en Docker). Esa batería es la definición de "mismo comportamiento". Después se escribe Laravel hasta que la misma batería, sin tocar una aserción, pasa contra él.
2. **Laravel 13 como adaptador, el núcleo en `backend/src/`.** `app/Http` solo traduce HTTP ↔ casos de uso. Los casos de uso (`Application`) orquestan; las reglas (`Domain`) son PHP puro; `Infrastructure` habla con Postgres (SQL parametrizado, el mismo que hoy), DeepSeek y el correo.
3. **SQL portado tal cual, sin Eloquent.** Las consultas de `netlify/functions/*.mts` se copian a repositorios con `DB::select`/`DB::insert` y parámetros posicionales. El SQL es la especificación de la reserva atómica y de las cuotas; reescribirlo en Eloquent cambiaría formatos (casts, fechas) y abriría diferencias. No hay modelos Eloquent.
4. **La base existente se adopta, no se migra.** Migraciones de Laravel, una por tabla, espejo exacto de `db/schema.sql`, cada una protegida con `Schema::hasTable()`: en Neon (tablas ya creadas) no hacen nada; en una base vacía crean exactamente lo mismo. Un test compara el esquema que sale de las migraciones con el que sale de `schema.sql`.
5. **Docker: nginx + php-fpm 8.4.** nginx sirve los estáticos del front y pasa `/api/*` y `/healthz` a php-fpm sin búfer (SSE). Mismo dominio, sin CORS en producción.
6. **El front no se toca hasta el final.** La API Node sigue siendo la referencia viva durante toda la construcción; se retira (y el front se mueve a `frontend/`) solo cuando la paridad está en verde y el dueño lo autoriza.

## Versiones fijadas (comprobado en Packagist el 2026-11-05)

| Pieza | Versión | Nota |
|---|---|---|
| PHP | 8.4 (imagen `php:8.4.22-fpm-alpine`) | Coincide con el PHP local 8.4.22. |
| `laravel/framework` | **13.40.0** (exacta en `composer.json`, `composer.lock` versionado) | Última estable publicada (2026-11-03). Pide `php ^8.3`. |
| Esqueleto `laravel/laravel` | 13.11.0 | Solo para crear el proyecto. |
| `phpunit/phpunit` | **12.5.43** (exacta) | La que trae el esqueleto de Laravel 13. Cambio aprobado en el punto de control 1 (antes 11.5.57). |
| PostgreSQL (local/CI) | `postgres:17-alpine` | El mismo que el `docker-compose.yml` actual. Producción: Neon. |
| nginx | `nginx:1.29-alpine` (tag exacto al crear la imagen) | |
| Mailpit | `axllent/mailpit:v1.27` (fijar el tag; hoy está en `latest`) | Solo desarrollo y contrato. |

Dependencias PHP nuevas más allá del esqueleto: **ninguna**. Correo SMTP con Symfony Mailer (ya viene con Laravel); Resend y Postmark con el cliente HTTP de Laravel, como hoy con `fetch`.

Nota local: el PHP de la máquina de desarrollo no tiene la extensión `openssl` (Composer falla en TLS). Todo se ejecuta dentro de Docker; no hace falta tocar el PHP local.

## Árbol objetivo

```
/                                 (raíz del repositorio)
├── frontend/                     ← tras la fase 6 (movimiento autorizado); hasta entonces el front sigue en la raíz
├── backend/                      Laravel 13
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/      un controlador invocable por endpoint (dispatch por método, ver "Paridad")
│   │   │   │   ├── HealthController.php
│   │   │   │   ├── GoneController.php                  /api/deepseek (410)
│   │   │   │   ├── Auth/{RequestLinkController, VerifyLinkController, SessionController}.php
│   │   │   │   ├── Ai/{ChatController, QuotaController}.php
│   │   │   │   ├── ProgressController.php
│   │   │   │   ├── ReadingsController.php
│   │   │   │   ├── PulseController.php
│   │   │   │   └── AdminController.php
│   │   │   ├── Requests/         un FormRequest por acción: authorize() + toCommand(); sin rules() de Laravel (ver "Validación")
│   │   │   ├── Middleware/{Cors, BodyLimit}.php
│   │   │   └── Support/{ApiJson, JsonBody, ErrorMap, ClientContext}.php
│   │   └── Providers/AppServiceProvider.php            enlaza los 3 puertos (Clock, ChatModel, LoginLinkSender)
│   ├── src/
│   │   ├── Shared/
│   │   │   ├── Domain/{DomainError, Clock, ClientIp, Hashing, DeviceId, HtmlSanitizer, IsoInstant}.php
│   │   │   └── Infrastructure/SystemClock.php
│   │   ├── Auth/
│   │   │   ├── Domain/{Email, LoginLinkSender, ReturnTo}.php
│   │   │   ├── Application/{RequestLoginLink, VerifyLoginLink, ResolveSession, Logout}.php
│   │   │   └── Infrastructure/{AuthRepository, MailLoginLinkSender, LoginEmail}.php
│   │   ├── Ai/                   (incluye la cuota: la usan chat, quota, session y el harness)
│   │   │   ├── Domain/{Pricing, QuotaLimits, QuotaPolicy, QuotaState, AiKind, PromptBuilder, PayloadError, ChatModel}.php
│   │   │   ├── Application/{ReserveCredits, ReadQuota, StreamChat, SettleUsage}.php
│   │   │   └── Infrastructure/{AiUsageRepository, DeepSeekClient}.php
│   │   ├── Progress/
│   │   │   ├── Application/{GetProgress, PutProgress}.php
│   │   │   └── Infrastructure/ProgressRepository.php
│   │   ├── Library/
│   │   │   ├── Domain/{ReadingValidator, PublishableId}.php
│   │   │   ├── Application/{ListReadings, PublishReading, CountRead}.php
│   │   │   └── Infrastructure/ReadingsRepository.php
│   │   ├── Pulse/
│   │   │   ├── Domain/Beat.php
│   │   │   ├── Application/RecordBeat.php
│   │   │   └── Infrastructure/PulseRepository.php
│   │   └── Admin/
│   │       ├── Application/{UsageReport, HideReading, ApplyBaselineSchema, CleanupSmokeData}.php
│   │       └── Infrastructure/AdminQueries.php
│   ├── config/ruta.php           todas las variables propias (cuota, correo, admin, pulso…) con su valor por defecto
│   ├── database/
│   │   ├── migrations/           7 migraciones (una por tabla), protegidas con hasTable
│   │   └── schema.sql            ← db/schema.sql movido en la fase 6 (hasta entonces se lee de la raíz)
│   ├── resources/content/        tracks.json y <ruta>.json exportados del front (generados, en .gitignore)
│   ├── routes/api.php            la lista explícita de rutas (una línea por endpoint)
│   ├── tests/
│   │   ├── Unit/{Shared,Auth,Ai,Library,Pulse}/…
│   │   ├── Feature/Http/…        contra Postgres real (base `ruta_test`)
│   │   ├── Architecture/{DomainIsFrameworkFreeTest, AppendOnlyTest}.php
│   │   ├── Golden/{PromptsGoldenTest, SanitizeGoldenTest, LoginEmailGoldenTest}.php
│   │   └── fixtures/{prompts.json, sanitize.json, login-email.json}   generados desde TS
│   ├── .env.example
│   └── phpunit.xml
├── docker/
│   ├── compose.yml               web + api + db + mailpit (+ fake-deepseek con el perfil `contract`)
│   ├── php/{Dockerfile, php.ini, www.conf}
│   └── nginx/{Dockerfile, default.conf}
├── tests/contract/               batería de paridad (node:test), común a Node y Laravel
│   ├── _lib.mts                  BASE_URL, peticiones, login vía API de Mailpit, consultas a la base, IP/dispositivo únicos por test
│   ├── fake-deepseek.mts         proveedor simulado (node:http) con modos: ok, lento, 402, 500, sin uso
│   ├── contract.env              entorno común a los dos servidores
│   └── <endpoint>.test.mts       uno por endpoint (ver "Estrategia de tests de contrato")
├── shared/                       (se queda junto al front; ver "Código compartido")
└── scripts/exportar-{contenido,prompts}.mts   nuevos: exportan contenido y fixtures para el backend
```

Reglas del árbol:
- Un contexto sin reglas propias **no tiene carpeta `Domain`** (Progress, Admin). Ocho contextos en vez de diez: **Quota vive dentro de `Ai`** (las dos cosas cambian juntas: precio, reserva, llamada), y el harness y el alumno comparten el contexto `Learner` (ver `specs/harness-alumno/plan.md`).
- `Domain` no importa nada de `Illuminate\`, `Laravel\`, `App\`, ni usa fachadas (`DB::`, `Http::`, `Log::`…). Lo vigila `tests/Architecture/DomainIsFrameworkFreeTest.php`.
- `Application` puede usar repositorios concretos de su `Infrastructure` (un solo adaptador, probado con Postgres real): **no se crea interfaz sin segundo adaptador o sin necesidad de test aislado**.

## Puertos y adaptadores

Solo tres puertos en todo el backend separado (el harness añade uno, `Tool`):

| Puerto (Domain) | Por qué existe | Adaptadores |
|---|---|---|
| `Shared\Domain\Clock` | Límites de tiempo y fechas testeables sin dormir | `SystemClock`; `FrozenClock` en tests |
| `Ai\Domain\ChatModel` | Los tests no pueden llamar a DeepSeek; el harness necesita un modelo simulado programable | `DeepSeekClient` (solo HTTP: `stream()` pasa bytes tal cual, `complete()` para el harness); `FakeChatModel` en tests |
| `Auth\Domain\LoginLinkSender` | Cuatro proveedores (`log`, `smtp`, `resend`, `postmark`) y los tests necesitan capturar el enlace | `MailLoginLinkSender` (elige proveedor como `_mail.mts`); `RecordingLinkSender` en tests |

Sin puerto (concretos, probados contra Postgres): `AuthRepository`, `AiUsageRepository`, `ProgressRepository`, `ReadingsRepository`, `PulseRepository`, `AdminQueries`.

Enlace de puertos: `AppServiceProvider` (tres `bind`). Un provider por contexto no aporta nada con tres enlaces.

## Mapa de módulos Node → Laravel

| Hoy | Mañana | Notas |
|---|---|---|
| `_http.mts` `corsHeaders`, `preflight`, `json`, `fail` | `app/Http/Middleware/Cors.php`, `app/Http/Support/ApiJson.php`, `ErrorMap.php` | `HandleCors` de Laravel se quita: sus cabeceras no son las mismas. |
| `_http.mts` `ApiError` | `Shared\Domain\DomainError(code, message, extra)` + `ErrorMap` (código → estado HTTP) | El dominio no conoce códigos HTTP. |
| `_http.mts` `ipDeProxy`, `hashIp`, `sha256Hex`, `randomToken`, `deviceId` | `Shared\Domain\{ClientIp, Hashing, DeviceId}` | Mismo algoritmo y misma pimienta: los `ip_hash`, `token_hash` y `anon` existentes siguen valiendo. |
| `_http.mts` `clientIp`, `plataforma` | desaparecen | La IP sale de `REMOTE_ADDR` + `TRUST_PROXY` (`ClientIp::fromProxy`). |
| `_http.mts` `readJson` | `app/Http/Support/JsonBody.php` | Ver "Paridad: detalles finos". |
| `_http.mts` `safeReturnTo` | `Auth\Domain\ReturnTo` | |
| `_auth.mts` | `Auth\Application\ResolveSession`, `Auth\Infrastructure\AuthRepository`, `Auth\Domain\Email` | |
| `_mail.mts` | `Auth\Infrastructure\{MailLoginLinkSender, LoginEmail}` | HTML y texto del correo idénticos (test dorado). |
| `_quota.mts` | `Ai\Domain\{Pricing, QuotaLimits, QuotaPolicy, QuotaState}`, `Ai\Application\{ReserveCredits, ReadQuota, SettleUsage}`, `Ai\Infrastructure\AiUsageRepository` | `comprobar()` se parte en dos: las sumas (SQL, repositorio) y la decisión (pura, `QuotaPolicy::check(medidas, kind, model, reservada)`). Mismos mensajes, letra por letra. |
| `_db.mts` | conexión `pgsql` de Laravel | Sin pglite ni driver neon: Neon se usa por TCP con `sslmode=require`. |
| `shared/prompts.ts` | `Ai\Domain\PromptBuilder` | Ver "Código compartido". |
| `shared/sanitize.ts` `htmlSeguro` | `Shared\Domain\HtmlSanitizer` | Test dorado contra la salida de TS. |
| `readings.mts` `validar`, `idPublicable` | `Library\Domain\{ReadingValidator, PublishableId}` | |
| `pulse.mts` `entero`, `MODULOS`, `PISTAS` | `Pulse\Domain\Beat` | Rutas válidas leídas de `resources/content/tracks.json`. |
| `admin.mts` | `AdminController` + `Admin\Application\*` + `AdminQueries` | |
| `server/index.mts` | nginx (estáticos, gzip, cabeceras) + php-fpm | |

## Inventario de endpoints y notas de paridad

Referencia de comportamiento: **la API Node servida por `server/index.mts` en Docker** (la que reemplaza este backend). Las diferencias de Netlify/Vercel no cuentan (AC-6 del spec). Todos los JSON de error tienen la forma `{"error":{"code":…,"message":…,…extra}}`.

Orden de comprobaciones: se respeta exactamente el del código actual (qué error sale primero importa). Se indica cuando no es obvio.

| Ruta | Métodos | Sesión | Comportamiento a conservar (resumen; el detalle lo fijan los tests de contrato) |
|---|---|---|---|
| `/healthz` | cualquiera | no | Lo responde el servidor antes que la función: `200 {"ok":true}` / `503 {"ok":false,"db":false}`, `Content-Type: application/json` (sin charset), `Cache-Control: no-store`, **sin cabeceras CORS** y sin preflight (un `OPTIONS` también hace `select 1`). |
| `/api/deepseek` | cualquiera (incluido `OPTIONS`) | no | `410 {"error":{"code":"gone","message":"Este endpoint ya no existe. Usa /api/ai/chat."}}`, `Content-Type: application/json`, `no-store`, sin CORS. |
| `/api/auth/request` | `POST` | no | Orden: preflight → 405 → `accounts_off` 404 → cuerpo (≤ 4096) → `bad_email` 422 → límites por correo/IP en la última hora (`too_many_links` 429) → inserta `login_tokens` con `return_to = safeReturnTo(Origin)` → envía (fallo → 502 `mail_failed`) → borrado oportunista de tokens caducados hace > 1 día → `200 {ok, minutes, delivery, mailboxUrl}`. |
| `/api/auth/verify` | cualquiera (sin preflight) | no | Siempre `302` con `Location: <base>/#auth=…` y `Cache-Control: no-store`, sin cuerpo y sin CORS. `auth=error` (sin token o excepción), `auth=expired`, o `auth=<token de sesión>`. Upsert de `users` con `on conflict (email) do update set last_seen_at = now()`. |
| `/api/auth/session` | `GET`, `POST` (cualquier otro = GET) | opcional | `POST` → borra la sesión del bearer → `{ok:true}`. Si no → `{user:{email}\|null, quota, accounts}`. Usuario bloqueado → 403 `account_blocked`. |
| `/api/quota` | cualquiera | opcional | `{quota, user, accounts}` (orden de claves distinto al de session: se conserva). |
| `/api/ai/chat` | `POST` | opcional | Orden: preflight → 405 → cuerpo (≤ 96 KB) → `bad_kind` 422 → modelo (lista blanca, por defecto `deepseek-chat`) → dispositivo, IP, usuario → `bad_payload` 422 → `reservar` (429/402/503 con sus mensajes) → proveedor (sin conexión → anula, 502 `provider_error`; no OK → anula, 502 `provider_no_credit` si 402, si no `provider_error`) → `200 text/event-stream; charset=utf-8`, `Cache-Control: no-store, no-transform`, `X-Accel-Buffering: no`, `X-Quota-Remaining` (= `max(0, remaining - 1)`, se conserva el "- 1" aunque esté mal: lo arregla TUT), `X-Quota-Limit`, `X-Quota-Window`. El cuerpo es el stream del proveedor **byte a byte**. Al terminar, la reserva se sustituye por el coste real si hubo `usage`. |
| `/api/progress` | `GET`, `PUT` | **obligatoria** | Orden: preflight → `requireUser` (401 antes que 405) → GET `{data, version, updatedAt}` o `{data:null, version:0, updatedAt:null}` → PUT: cuerpo ≤ `PROGRESS_MAX_KB` → `bad_progress` 422 → insert si no hay fila → 409 `version_conflict` con `server:{data,version,updatedAt}` → update condicional (0 filas → 409 sin `server`) → `{version, updatedAt}`. |
| `/api/readings` | `GET`, `POST` | POST sí (salvo contador) | GET: `track` fuera de lista → `b1b2`; `after`; tope `SHARED_READINGS_MAX` (1..200); `Cache-Control: public, max-age=120`; `{textos:[…]}`. POST con `?id=&read=1` suma lectura sin cuenta → `{ok:true}`. POST sin sesión → 401 con su mensaje propio. Validación → 422 `bad_payload`/`payload_too_large`. `{ok:true, id}`. |
| `/api/pulse` | `POST` | no | `PULSE_ENABLED=false` → `{ok:true, off:true}` (antes de leer el cuerpo). Sin dispositivo → `{ok:true}`. Upsert con `greatest`. |
| `/api/admin` | `GET`, `POST` | token | Sin `ADMIN_TOKEN` → 404 `not_found` "No disponible."; token (query o bearer) distinto → 403 `forbidden`. `op=schema` → aplica el esquema base (`{ok, message:"Esquema aplicado (N sentencias)."}`); `op=cleanup-test`; `op=hide` (`bad_id` 422, 404); GET → informe (claves `presupuesto, totales, por_dia, por_tipo, top_del_mes, uso{resumen, embudo, modulos_abiertos}, biblioteca`). Un `POST` sin `op` conocido devuelve el informe (como hoy). |
| cualquier otra `/api/*` | cualquiera | — | `404 {"error":{"code":"not_found","message":"Endpoint desconocido"}}`, `Content-Type: application/json`, `no-store`, sin CORS. |
| fuera de `/api/` y `/healthz` | — | — | Laravel responde 404 (AC-10). En el stack Docker, nginx sirve el front antes de llegar a PHP. |

Borrados que ya existen en la API y se conservan por paridad (no son "borrados nuevos"): logout (`delete from sessions`), limpieza oportunista de `login_tokens`, `op=cleanup-test` de admin. Updates existentes que se conservan: `sessions.last_used_at`, `users.last_seen_at`, `login_tokens.used_at`, `ai_usage` (anulación y coste real), `progress`, `shared_readings.reads/hidden`, `pulse`.

### Paridad: detalles finos (cada uno con su test de contrato o unitario)

| Detalle | Node hoy | Cómo se iguala en PHP |
|---|---|---|
| Rutas y métodos | Cada función decide por método; un método no previsto da su 405 JSON con CORS | `Route::any()` por ruta y el controlador despacha por método. El 405 de Laravel no aparece nunca. |
| Tope de cuerpo de `readJson` | Compara `text.length` (unidades UTF-16), no bytes | `JsonBody` cuenta unidades UTF-16 (`strlen(mb_convert_encoding($s, 'UTF-16LE', 'UTF-8')) / 2`). |
| Cuerpo vacío / `null` / inválido | `""` → `{}`; JSON inválido → 400 `bad_json`; `null` es válido | Se lee `$request->getContent()`; nunca `$request->json()` (que traga el error). |
| Cuerpo > 2 MB | `server/index.mts` lanza y responde 500 `server_error` sin CORS | Middleware `BodyLimit`; nginx `client_max_body_size 3m` y `post_max_size 3M` para que llegue a PHP. |
| JSON `jsonb` (progreso, lecturas) | `{}` vacío se devuelve como `{}` | `json_decode($raw)` **sin** `assoc` (objetos `stdClass`) y `json_encode` con `JSON_UNESCAPED_UNICODE \| JSON_UNESCAPED_SLASHES \| JSON_PRESERVE_ZERO_FRACTION`. Test: un progreso con `{}`, `[]`, `0.0` y acentos vuelve igual. |
| Fechas `timestamptz` | El driver las convierte en `Date` → `"2026-11-05T10:00:00.123Z"` | `Shared\Domain\IsoInstant::fromPg()` → UTC, milisegundos, `Z`. |
| `numeric` (admin `usd`) | Cadena (`"0.0123"`) | Se deja la cadena que da PDO; no se convierte. |
| `::int` | Número | PDO pgsql devuelve `int` (PHP ≥ 8.1). |
| `version` en PUT | Solo cuenta si es número JS finito | `is_int \|\| (is_float && is_finite)`; una cadena `"3"` cuenta como 0. |
| Token aleatorio | base64url sin relleno de 32 bytes | `rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=')`. |
| Comparación del token de admin | `!==` | `hash_equals` (mismo resultado, sin fuga de tiempo). |
| Cookies | Ninguna | Rutas sin middleware de sesión ni cookies; test: ninguna respuesta lleva `Set-Cookie`. |
| `Cache-Control: no-store` | Exacto | Symfony añade `, private` a todo `Cache-Control` sin `public`/`private`. **Excepción aceptada**: los tests comprueban las directivas (`no-store` presente; `public, max-age=120` exacto en lecturas). `private` solo restringe más. |
| SSE sin búfer | `res.write` por trozo | `StreamedResponse` + `flush()` por trozo; `output_buffering=Off`; nginx `fastcgi_buffering off`; `gzip` no se aplica a `text/event-stream`. Test: el primer trozo llega antes de que el proveedor simulado termine. |
| Cliente que corta el stream | La reserva se queda con el coste estimado | Igual: no se usa `ignore_user_abort`. |
| Tiempo por petición | `requestTimeout = 0` | `max_execution_time=0`, `request_terminate_timeout=0`, `fastcgi_read_timeout 600s` (entre trozos). |

## Estrategia de adopción de la base (migraciones)

Requisitos: espejo exacto de `db/schema.sql`; nunca alterar ni borrar tablas existentes en Neon; legible (una migración por tabla).

| Opción | Pros | Contras |
|---|---|---|
| A. Migraciones por tabla con guarda `if (Schema::hasTable(...)) return;` | Legibles; en producción no hacen nada; en una base vacía crean lo mismo; sin pasos manuales en la base | La guarda mira la tabla, no sus columnas: si producción difiriera de `schema.sql`, no se notaría al migrar |
| B. Una migración "línea base" que ejecuta `schema.sql` | Espejo exacto por construcción | No es "una por tabla, legible"; Laravel deja de describir el esquema |
| C. Migraciones sin guarda y marcarlas como ejecutadas a mano en producción (`insert into migrations`) | Laravel "estándar" | Escritura manual en producción, fácil de equivocar; un `migrate` sin marcar intentaría crear tablas existentes |

**Elegida: A**, con dos redes contra su único defecto:
1. `tests/Feature/Database/SchemaParityTest.php`: crea una base con `schema.sql` (vía `psql`) y otra con `migrate:fresh`, y compara columnas (tipo, nulo, defecto), restricciones (`pg_constraint`) e índices (`pg_indexes.indexdef`). Tiene que salir idéntico.
2. Antes del corte, una comparación **de solo lectura** contra Neon (`pg_dump --schema-only` o las mismas consultas a `information_schema`/`pg_indexes`) frente a la base creada con `schema.sql`. La ejecuta el dueño (tarea 3.5, autorización).

Migraciones (fecha fija `2026_11_05_0000NN`): `users`, `login_tokens` (con `return_to` y sus dos índices), `sessions`, `ai_usage` (con `cost_micros` y los cinco índices, el de `device_id` parcial), `progress`, `shared_readings` (el índice `lower(topic)` por `DB::statement`), `pulse` (clave primaria compuesta). Donde el constructor de esquemas de Laravel no expresa exactamente la DDL (índices parciales y de expresión, `default current_date`, `default gen_random_uuid()`), se usa `DB::statement` con el SQL literal de `schema.sql`. Las `alter table … add column if not exists` de `schema.sql` no se repiten: la columna va en la creación (el test de paridad lo confirma).

Consecuencias:
- En producción, el primer `php artisan migrate` crea **una tabla nueva**, `migrations` (de Laravel), y registra las siete como ejecutadas sin tocar nada más. Necesita autorización (tarea 3.6).
- Las migraciones del esqueleto de Laravel (`users`, `password_reset_tokens`, `sessions`, `cache`, `jobs`) **se eliminan del proyecto nuevo antes del primer `migrate`**: chocan de nombre con `users` y `sessions`. `SESSION_DRIVER=array`, `CACHE_STORE=array`, `QUEUE_CONNECTION=sync`.
- `op=schema` de admin sigue aplicando `schema.sql` (idempotente) por paridad. No crea las tablas del harness (esas solo por migración).
- `down()` de las siete migraciones base: vacío a propósito (nunca se borra una tabla con datos de producción). Documentado en la clase.

## Topología Docker

```
                 ┌──────────── docker/compose.yml (proyecto ruta2) ────────────┐
 navegador ──►   │ web (nginx:1.29-alpine)  :8081→80                            │
                 │   /            → estáticos del front (dist, SPA → index.html)│
                 │   /api/*, /healthz → fastcgi api:9000 (sin búfer)           │
                 │ api (php:8.4.22-fpm-alpine + pdo_pgsql + opcache)           │
                 │ db (postgres:17-alpine) · mailpit · fake-deepseek (perfil)  │
                 └─────────────────────────────────────────────────────────────┘
```

- **Por qué nginx + php-fpm y no FrankenPHP**: es la opción aburrida y conocida; el streaming SSE está resuelto con `fastcgi_buffering off`; nginx ya hace lo que hoy hace `server/index.mts` con los estáticos (gzip, ETag, caché, SPA). FrankenPHP reduciría a un contenedor, pero su modo worker obliga a cuidar el estado entre peticiones y su modo clásico no aporta nada frente a fpm. Se puede revisar más adelante sin tocar el código.
- Cada SSE ocupa un worker de fpm mientras dura (correcciones de hasta minutos; harness ≤ 45 s). `pm = dynamic`, `pm.max_children = 16` por defecto (env `FPM_MAX_CHILDREN`), dimensionado en `DESPLIEGUE.md`.
- `docker/nginx/Dockerfile` es multi-etapa: etapa `node:22-alpine` que construye el front (`npm run build`) y exporta el contenido (`scripts/exportar-contenido.mts`); etapa final nginx con `dist/`. `docker/php/Dockerfile` copia `resources/content/` de esa misma etapa (un único `Dockerfile` con `target`s si resulta más simple; se decide en la tarea 2.2).
- Cabeceras de estáticos (antes en `netlify.toml` y `cacheFor()`): `/_assets/*` `public, max-age=31536000, immutable`; `sw.js` y `manifest.webmanifest` `no-cache` (manifest con `application/manifest+json`); `.html` `no-cache`; resto `public, max-age=3600`; en todo: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`. Ojo: `add_header` de nginx no se hereda si un `location` define los suyos; se repiten con un `include`.
- `HEALTHCHECK` del servicio `web` contra `/healthz`. Cierre: nginx `quit` y php-fpm termina las peticiones en curso (`process_control_timeout = 60s`).
- Migraciones: servicio de un solo uso `migrate` (`php artisan migrate --force`) solo en el perfil `local`/`contract`; en producción lo lanza una persona (autorización).
- El `docker-compose.yml` y el `Dockerfile` de la raíz (Node) **no se tocan** hasta la fase 6: son la referencia de los tests de contrato.

## Servir el front

Mismo VPS, mismo dominio (decisión K1): nginx sirve el `dist/` de Astro y pasa la API a PHP. `PUBLIC_API_BASE` vacío. `APP_URL` = el origen del front, que es también el de la API, así que el enlace mágico `…/api/auth/verify` sigue funcionando. `ALLOWED_ORIGINS` se fija al dominio (no `*`) en producción. En desarrollo, `astro dev` sigue haciendo de proxy a `DEV_API_TARGET` (por defecto `http://localhost:8081`).

## Código compartido (prompts, saneado, contenido)

| Qué | Consumidores | Decisión | Por qué |
|---|---|---|---|
| `shared/prompts.ts` | Cliente con clave propia (`ai.ts` usa `buildMessages`), servidor | **TS sigue siendo la fuente**. `Ai\Domain\PromptBuilder` es un port a PHP verificado por **fixtures doradas**: `scripts/exportar-prompts.mts` ejecuta `buildMessages` sobre una matriz de casos (cada `kind`, topes, recortes, errores `PayloadError`) y escribe `backend/tests/fixtures/prompts.json`; `PromptsGoldenTest` exige salida idéntica. Un test `node:test` falla si el fixture no está al día. | Plantillas JSON comunes no bastan: los prompts llevan lógica (recortes, ramas, validación) que habría que duplicar igual. Mover el modo clave propia al servidor rompería el principio 8 (sin cuenta, sin servidor). Dos implementaciones + oráculo automático es lo más simple que no deriva. |
| `shared/sanitize.ts` | Cliente, servidor | Igual: `HtmlSanitizer` + `fixtures/sanitize.json` generado desde TS. | Misma razón. |
| Correo del enlace | Solo servidor | Port directo + `fixtures/login-email.json` generado desde `_mail.mts` (asunto, texto, HTML). | Se retira el original; se comprueba una vez. |
| Contenido de estudio (`src/data/`) y lista de rutas | Front; el backend necesita rutas válidas (pulso, lecturas) y, en el harness, el contenido | `scripts/exportar-contenido.mts` (Node con type stripping, importa `src/data/*` como ya hace `exportar-plan.mts`) escribe `backend/resources/content/tracks.json` y `<ruta>.json` (índice compacto: unidades, mazos, lecturas, escucha, días del plan, referencias de ítems). Se genera en el build Docker y con `npm run content:export` en desarrollo; **no se versiona** (`.gitignore`); el backend falla al arrancar si falta. | Una sola fuente (`src/data/`), sin copias a mano. Generado en build = nunca desfasado en producción. |

`shared/` **se queda junto al front**: en la fase 6 se mueve a `frontend/shared/`, así las rutas relativas `../../shared/...` de `src/scripts/` no cambian y Vite no necesita permisos fuera de la raíz del proyecto.

## Variables de entorno (antes → después)

Todas conservan nombre y significado (AC-13). Se leen en `config/ruta.php`, nunca con `env()` fuera de `config/`.

| Variable | Estado |
|---|---|
| `DATABASE_URL` | Igual. `config/database.php` la usa como `url` de la conexión `pgsql`. |
| `DEEPSEEK_API_KEY`, `DEEPSEEK_URL` | Igual. |
| `QUOTA_*` (`ANON_LIFETIME`, `ANON_WINDOW`, `ANON_DAILY`, `ANON_IP_WINDOW_DAYS`, `USER_DAILY`, `USER_MONTHLY`, `GLOBAL_DAILY`, `GLOBAL_DAILY_USD`, `PER_MINUTE`, `CREDIT_MICROS`), `AI_MAX_TOKENS`, `PRICE_CHAT_*`, `PRICE_REASONER_*` | Igual, mismos valores por defecto y misma regla de lectura (`num()`: entero o el defecto). |
| `ACCOUNTS_ENABLED`, `MAIL_PROVIDER`, `MAIL_FROM`, `RESEND_API_KEY`, `POSTMARK_TOKEN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_INSECURE`, `MAILBOX_URL` | Igual. No se usan las `MAIL_*` de Laravel. |
| `APP_URL`, `ALLOWED_ORIGINS`, `IP_PEPPER`, `TRUST_PROXY`, `ADMIN_TOKEN`, `PULSE_ENABLED`, `SESSION_DAYS`, `LOGIN_LINK_MINUTES`, `LOGIN_MAX_PER_EMAIL_HOUR`, `LOGIN_MAX_PER_IP_HOUR`, `PROGRESS_MAX_KB`, `SHARED_READINGS_MAX` | Igual. `APP_URL` también la usa Laravel con el mismo significado. |
| `BACKUP_DIR`, `BACKUP_KEEP` | Pasan a `start.sh backup` (`pg_dump` en el contenedor `db`) en la fase 6. |
| `DB_DRIVER`, `PGLITE_DIR`, `DB_POOL_MAX` | **Desaparecen** (sin pglite ni pool propio). |
| `PORT`, `HOST`, `STATIC_DIR`, `SKIP_MIGRATE`, `PLATAFORMA_API`, `NODE_OPTIONS` | **Desaparecen** (eran de `server/index.mts`). |
| `NETLIFY*`, `SITE_ID`, `VERCEL` | **Desaparecen** (detección de plataforma). |
| `APP_KEY`, `APP_ENV=production`, `APP_DEBUG=false`, `LOG_CHANNEL=stderr`, `LOG_LEVEL=warning`, `SESSION_DRIVER=array`, `CACHE_STORE=array`, `QUEUE_CONNECTION=sync`, `FPM_MAX_CHILDREN` | **Nuevas** (Laravel / Docker). `APP_KEY` la exige el framework aunque no se cifre nada. |
| `PUBLIC_API_BASE`, `DEV_API_TARGET` | Del front; pasan a `frontend/.env.example` en la fase 6. |

Logs: nunca el token de sesión, el cuerpo de la petición ni los prompts (el `console.error` del detalle del proveedor se conserva recortado a 500 caracteres, como hoy).

## Validación (FormRequest por acción)

Regla global: un FormRequest por acción con entrada. Aquí la validación **debe** producir exactamente los códigos y mensajes actuales, y el formato de error de Laravel no coincide. Por eso cada FormRequest:
- no declara `rules()` (o las deja vacías) y sobreescribe `failedValidation`/`failedAuthorization` para no producir nunca el JSON de Laravel;
- expone `toCommand()`, que lee el cuerpo con `JsonBody` (tope del endpoint) y construye el comando de la capa `Application` usando los objetos de valor del dominio (`Email::fromRaw` lanza `bad_email`, etc.).

Así la validación vive en el borde (FormRequest + objetos de valor), los mensajes no cambian y el dominio sigue siendo la única regla. FormRequests: `RequestLinkRequest`, `ChatRequest`, `PutProgressRequest`, `PublishReadingRequest`, `RecordBeatRequest`, `AdminRequest` (token; `authorize()` hace `assertAdmin`). Los GET sin entrada no tienen FormRequest.

## Estrategia de tests de contrato

- **Ubicación**: `tests/contract/*.test.mts` en la raíz, `node:test` + `fetch`. Script raíz `test:contract` (`node --experimental-strip-types --test "tests/contract/*.test.mts"`), con `BASE_URL`, `CONTRACT_DATABASE_URL`, `MAILPIT_URL`, `ADMIN_TOKEN`.
- **Entorno común** (`tests/contract/contract.env`): `MAIL_PROVIDER=smtp` a Mailpit, `DEEPSEEK_URL` al proveedor simulado, `TRUST_PROXY=1`, `ADMIN_TOKEN` fijo, `QUOTA_*` por defecto. Los dos servidores arrancan con este mismo fichero.
- **Aislamiento entre tests**: con `TRUST_PROXY=1`, cada test manda su propio `X-Forwarded-For` (IP única) y su `X-Device-Id`: la cuota y el ritmo de un test no tocan a otro. Correos únicos `<uuid>@smoke.test` (los limpia `op=cleanup-test`).
- **Sesión**: `POST /api/auth/request` → se lee el enlace en la API de Mailpit → `GET /api/auth/verify` sin seguir redirecciones → token del fragmento.
- **Efecto en la base**: consultas de solo lectura con `pg` a `CONTRACT_DATABASE_URL` (filas creadas en `login_tokens`, `sessions`, `ai_usage`, `progress`, `shared_readings`, `pulse`).
- **Qué se compara**: estado; cabeceras (CORS exactas, `Content-Type`, directivas de `Cache-Control`, `X-Quota-*`, `Location`, ausencia de `Set-Cookie`); cuerpo JSON por forma (claves y tipos) y valores exactos donde son deterministas (códigos, mensajes, `minutes`, `delivery`); fechas con la regex ISO de milisegundos; stream SSE byte a byte contra lo que emitió el simulado.
- **Archivos**: `health`, `not-found`, `deepseek`, `cors`, `auth-request`, `auth-verify`, `auth-session`, `quota`, `ai-chat`, `progress`, `readings`, `pulse`, `admin`, `client-ip`, `body-limits`, `cross-compat` (fase 5).
- **Fuera de la batería** (no se puede fijar desde fuera con un solo entorno): `ADMIN_TOKEN` sin definir (404) y `ACCOUNTS_ENABLED=false` (404 `accounts_off`), `/healthz` sin base (503). Esos van como tests de Feature en PHPUnit y como casos documentados.
- **Disciplina**: los tests de contrato se escriben como **caracterización** (verdes contra Node desde el primer día). El "rojo primero" ocurre contra Laravel: cada lote de contextos empieza con su archivo de contrato en rojo contra el stack nuevo. Desde el punto de control 1.13, cualquier cambio en `netlify/functions/` exige actualizar contrato y Laravel en la misma tarea.

## Corte y vuelta atrás

1. Paridad en verde contra Laravel (fase 5), dos ejecuciones seguidas.
2. Prueba cruzada contra la **misma base**: sesión creada por Node vale en Laravel y al revés; `ip_hash` y `anon` iguales; progreso escrito por uno lo lee el otro (`cross-compat.test.mts`). Esto demuestra que los dos pueden convivir.
3. (Autorización) Comparación de esquema de solo lectura contra Neon.
4. (Fuera de esta feature, autorización de despliegue) VPS con el stack `docker/`, `DATABASE_URL` = Neon, `php artisan migrate --force` (crea `migrations`, no toca nada más).
5. Cambio de DNS del dominio al VPS. Netlify sigue desplegado con `master` intacto.
6. **Vuelta atrás**: devolver el DNS a Netlify. No hay datos que deshacer: el esquema es el mismo y las dos APIs escriben lo mismo. Lo único nuevo en la base es la tabla `migrations` (inocua para Node).
7. `master` solo se actualiza cuando el VPS lleva días estable y el dueño lo dice (sin `netlify.toml`, un push a `master` rompería Netlify).

## Mapa de movimientos (fase 6, todo con autorización humana)

Se hace **después** de retirar Node, en dos commits: uno solo de `git mv` (sin cambios de contenido) y otro con los ajustes de rutas.

| Desde | Hacia |
|---|---|
| `src/`, `public/`, `astro.config.mjs`, `tsconfig.json` | `frontend/` |
| `shared/` | `frontend/shared/` |
| `scripts/{precache,validar-plan,exportar-plan,exportar-contenido,exportar-prompts}.mts` | `frontend/scripts/` |
| `tests/{sesion,selector-ruta,sanitize}.test.mts` (y los de cliente que existan entonces) | `frontend/tests/` |
| `db/schema.sql` | `backend/database/schema.sql` |
| `package.json` | se parte: `frontend/package.json` (app) y raíz mínima (`test:contract`, `test:all`, dependencia `pg`) |
| `.env.example` | se parte: `backend/.env.example` y `frontend/.env.example` |

Borrados (autorización): `netlify/` entera, `server/index.mts`, `api/`, `vercel.json`, `netlify.toml`, `Dockerfile` y `docker-compose.yml` de la raíz, `tests/{quota,client-ip,readings-validar}.test.mts` (portados a PHPUnit), `scripts/backup.mts` (sustituido por `pg_dump`), dependencias `@netlify/functions`, `@neondatabase/serverless`, `pg` (pasa a la raíz mínima), `nodemailer`, `@electric-sql/pglite`. Se quedan: `_viejo/`, `server/laravel/`, `.github/workflows/deploy.yml`, `scripts/smoke.mts` si solo usa HTTP (se comprueba en la tarea).

Sin npm workspaces: con el backend en PHP solo queda un proyecto npm de verdad (el front); la raíz mínima solo tiene los tests de contrato.

## Impacto en specs en curso

| Spec | Impacto |
|---|---|
| `selector-de-ruta` | Ninguno hasta la fase 6; tras ella, rutas `frontend/…` en lo pendiente. |
| `ruta-b2-c1` fases 1 y 2 | Tocan `pulse.mts`, `progress.mts`, `readings.mts` (lista de rutas). **Tienen que estar hechas antes de la tarea 1.1**: los contratos se escriben sobre ese comportamiento. Si llegan después, cada cambio va con su contrato y su versión PHP. |
| `tutor-contextual` fases 1–2 (servidor) | Se implementan **en Laravel**, después de esta feature: `kind: "explain"` en `shared/prompts.ts` (fuente) + fixture regenerado + `PromptBuilder`; `creditosEstimados` en `Ai\Domain\QuotaPolicy`; `X-Quota-Remaining` sin "- 1" (cambia un contrato: se actualiza en esa tarea). Rutas de sus `tasks.md` se reescriben en la tarea 6.5. |
| `harness-alumno` | Depende de esta feature; vive en `backend/src/Learner` (ver su plan). |
| `specs/ORDEN.md` | Actualizado (sección añadida 2026-11-05, Laravel). |

## Qué NO hacemos

- Ni Eloquent, ni modelos, ni repositorios genéricos, ni un "bus" de comandos: SQL portado y casos de uso como clases simples.
- Ni interfaces para repositorios con un solo adaptador.
- Ni Sanctum, ni sesiones de Laravel, ni cookies: el bearer y sus hashes siguen como están.
- Ni colas, ni Horizon, ni Redis, ni Reverb: nada de esto lo necesita la API actual.
- Ni cambios de comportamiento "de paso" (el `- 1` de `X-Quota-Remaining`, el `private` aparte).
- Ni modo pglite en PHP: desarrollo local con el Postgres de Docker.
- Ni despliegue, DNS, TLS ni cambios en `master`.
- Ni tocar `_viejo/` ni `server/laravel/`.

## Cambios respecto al spec

| Spec | Cambio | Motivo |
|---|---|---|
| Overview, AC-5, Non-goal "no reescribir en Laravel" | Servidor Laravel 13 / PHP 8.4, hexagonal; la "lista explícita de rutas" es `routes/api.php` | Decisión del usuario 2026-11-05. |
| AC-1, AC-2 | `backend/` es PHP; el código compartido con el front se queda en TS (`frontend/shared/`) y el backend lo verifica con fixtures doradas | No hay import cruzado TS↔PHP posible. |
| AC-3 | `git mv` solo para el front y `schema.sql`; el código de la API Node no se mueve, se reescribe y se borra | El backend no es el mismo código. |
| AC-4 | Sin npm workspaces; `composer test` + `npm test` + `npm run test:contract` desde la raíz con `npm run test:all` | Solo queda un proyecto npm. |
| AC-7 | Contratos en `tests/contract/`, contra Docker (Node) y Docker (Laravel); `Cache-Control` con `private` añadido por Symfony aceptado | Ver "Paridad: detalles finos". |
| AC-8 | `tests/quota.test.mts` y `client-ip.test.mts` se portan a PHPUnit con los mismos casos; los originales se borran con Node | |
| AC-10 | Laravel responde 404 fuera de la API; los estáticos los sirve nginx del mismo stack | Decisión K1: mismo VPS y dominio. |
| AC-11 | Sin `closeDb`: PDO por petición; cierre ordenado de nginx/fpm | |
| AC-12 | `docker/compose.yml` nuevo; esquema por migraciones protegidas en vez de `schema.sql` al arrancar; desaparece `start:local` con pglite | |
| AC-13 | Desaparecen `DB_DRIVER`, `PGLITE_DIR`, `DB_POOL_MAX` además de las de plataforma; nuevas las de Laravel | |
| AC-21 | También se borran `Dockerfile`/`docker-compose.yml` de la raíz | Sustituidos por `docker/`. |
| AC-24 | La suite son tres: front (`node:test`), back (PHPUnit), contrato (`node:test`) | |
| AC-26 | El diff incluye el backend entero nuevo; la paridad se demuestra con contratos, no con el diff | |
| Non-goal "sin migraciones" | Hay migraciones, pero en producción no hacen nada salvo crear la tabla `migrations` | Requisito del usuario. |
| Non-goal "sigue node:test" | PHPUnit 12.5 en el backend | Requisito del usuario (PHPUnit 12.5 aprobado en el punto de control 1). |

## Riesgos

- **Detalles de paridad que no se ven en el código** (formato de fechas, `{}` vs `[]`, longitud UTF-16, orden de errores). Mitigación: tabla de detalles finos, cada uno con test; prueba cruzada sobre la misma base.
- **Neon distinto de `schema.sql`** (alguien cambió algo a mano). La guarda `hasTable` no lo detectaría. Mitigación: comparación de solo lectura antes del corte (3.5).
- **Workers de fpm ocupados por SSE**: 16 streams largos a la vez dejan sin workers a las demás peticiones. Mitigación: tamaño configurable, documentado; el ritmo por minuto de la cuota acota a cada usuario.
- ~~PHPUnit 11~~: resuelto; se usa PHPUnit 12.5.43, la del esqueleto (aprobado en el punto de control 1).
- **`deepseek-chat` ya no aparece en la lista de modelos de DeepSeek** (la página de precios de 2026-11 lista `deepseek-flash` y `deepseek-v4-pro`). La API actual lo usa y esta feature no cambia eso (paridad); si DeepSeek lo retira, la IA de la app falla igual en Node que en Laravel. Se señala para decidir aparte.
- **Trabajo en curso sobre `netlify/functions/`** mientras se construye Laravel: cada cambio hay que hacerlo dos veces. Mitigación: congelar la API Node desde el punto de control 1.13 (anotado en `ORDEN.md`).
- **Exportación de contenido ausente** al arrancar el backend: falla al arrancar con mensaje claro (mejor que servir rutas vacías).

## Decisiones por defecto revisables

| # | Decisión | Alternativa |
|---|---|---|
| D-1 | PHPUnit 12.5.43 (aprobado en el punto de control 1) | 11.5.57 (decisión original) |
| D-2 | nginx + php-fpm, `pm.max_children = 16` | FrankenPHP |
| D-3 | Contenido exportado en build, sin versionar | Versionar el JSON exportado con un test de frescura |
| D-4 | Sin npm workspaces | Workspaces (decisión K1 por defecto) |
| D-5 | Excepción `Cache-Control: …, private` | Forzar cabecera cruda (más código, sin beneficio) |
