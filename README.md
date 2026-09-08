# Ruta B1 → B2

App instalable (PWA) para preparar exámenes de certificación de inglés B1/B2
—Cambridge B1 Preliminary y B2 First, IELTS, TOEFL, Aptis, Linguaskill—
hecha con **Astro 7 + TypeScript**, con API propia y **PostgreSQL**.

- **Todo el material es libre y sin cuenta**: diagnóstico, plan de 24 semanas, 18 unidades de
  gramática, 154 tarjetas con repetición espaciada, Use of English, writing, speaking, lectura y
  simulacro. Funciona sin conexión.
- **La clave de DeepSeek nunca llega al navegador.** Las correcciones pasan por `/api/ai/chat`,
  que compone los prompts en el servidor y aplica cuotas.
- **Cuenta solo cuando hace falta**: se estudia sin registrarse; al agotar el cupo de prueba de
  correcciones se entra con un enlace por correo, sin contraseña. La cuenta además sincroniza el
  progreso entre dispositivos.

## Arrancar

```bash
bash start.sh
```

Eso construye el front, levanta la API, la base de datos y un buzón de correo, aplica el esquema
y espera a que todo responda. La primera vez tarda un par de minutos; después, segundos.

```
App      http://localhost:8080
Correo   http://localhost:8025   ← aquí llegan los enlaces para entrar
```

Lo único que hay que poner a mano es la clave de DeepSeek: ábrela en `.env`
(`DEEPSEEK_API_KEY=sk-…`, se saca en <https://platform.deepseek.com/api_keys>) y
`bash start.sh restart`. Sin ella la app funciona entera menos las correcciones con IA.

`start.sh` crea el `.env` la primera vez y genera solo la contraseña de la base, el `IP_PEPPER`
y el `ADMIN_TOKEN`.

| Comando | Qué hace |
|---|---|
| `bash start.sh` | levanta todo |
| `bash start.sh logs` | logs en vivo |
| `bash start.sh stop` | parar, conservando los datos |
| `bash start.sh restart` | reconstruir tras cambiar código o `.env` |
| `bash start.sh admin` | llamadas y tokens gastados |
| `bash start.sh psql` | consola SQL |
| `bash start.sh test` | prueba de humo de todo el stack |
| `bash start.sh reset` | borrar la base y empezar de cero |

### Comprobar que todo funciona

```bash
bash start.sh test
```

28 comprobaciones contra el stack que acabas de levantar: que el front se sirve entero, que
**no hay ninguna clave en el bundle del navegador**, que el service worker no cachea `/api/`,
que una corrección real llega por streaming y sus tokens quedan contabilizados, que el cupo
anónimo se agota con el mensaje correcto, que el enlace mágico entra y no vale dos veces,
que la cuota sube al iniciar sesión, que el progreso sincroniza y detecta conflictos de versión,
y que el endpoint de administración rechaza un token incorrecto. Al terminar borra las cuentas
que creó (`@smoke.test`).

Gasta unas 6 llamadas reales a DeepSeek. Para no gastarlas: `SMOKE_SKIP_AI=1 bash start.sh test`.

### Sin Docker y sin crear ninguna base

```bash
npm install
npm run build
npm run start:local     # http://localhost:8080
```

Eso es todo: sin PostgreSQL instalado, sin contenedores y sin cuenta en ningún
sitio. `DB_DRIVER=pglite` levanta un Postgres compilado a WASM que guarda en
`./data/pglite`, y como es Postgres de verdad —no una imitación— corren las
mismas consultas: `jsonb`, `uuid`, `on conflict … do update`, `width_bucket`…
No hay un segundo esquema que mantener.

Dos cosas que conviene saber antes de usarlo en serio:

- **Un solo proceso.** La base vive dentro del que la abre. Un segundo proceso
  sobre la misma carpeta la dejaría inservible, así que el arranque pone un
  cerrojo (`data/pglite/en-uso.json`) y el segundo se niega a entrar. Eso también
  significa que para hacer una copia hay que parar la app un momento.
- **Necesita disco.** En Netlify y en Vercel no lo hay: cada llamada arranca con
  el sistema de archivos limpio y la base desaparecería. Ahí, Postgres.

Cambiar a Postgres cuando toque son dos comandos y no se toca ni una consulta:

```bash
node scripts/backup.mts                                  # con la app parada
DATABASE_URL='postgresql://…' node scripts/backup.mts --restore backups/ruta-….jsonl.gz
```

### Sin Docker, con tu propio PostgreSQL

```bash
npm install
cp .env.docker.example .env      # rellena DATABASE_URL y DEEPSEEK_API_KEY
npm run build                    # astro check + astro build → dist/
npm start                        # servidor en :8080, aplica el esquema al arrancar
```

### Desarrollo del front con recarga en caliente

```bash
bash start.sh          # backend + base de datos en :8080
npm run dev            # front con HMR en :4321
```

Abre **http://localhost:4321**. El servidor de Astro hace de proxy de `/api/*` y `/healthz`
hacia `http://127.0.0.1:8080`, así que en desarrollo el front habla con el backend real,
mismo origen y sin CORS. Si tu backend está en otro sitio:

```bash
DEV_API_TARGET=http://192.168.1.50:8080 npm run dev
```

El enlace mágico vuelve al origen desde el que lo pediste (`:4321` en desarrollo,
tu dominio en producción), así que la sesión y el progreso se quedan donde estabas.
En `:4321` no hay service worker: eso es a propósito, para no pelearse con la caché.

---

## Cómo está montado

```
src/                      front (Astro, estático)
├── data/*.ts             todo el contenido del curso, tipado
├── components/views/     el markup de cada módulo
└── scripts/
    ├── api.ts            cliente de la API propia (device id, sesión, cuota)
    ├── ai.ts             correcciones: servidor compartido o clave propia
    ├── sync.ts           progreso: fusión y subida
    └── views/*.ts        lógica de cada módulo

shared/prompts.ts         los prompts, compartidos por servidor y cliente
db/schema.sql             esquema de PostgreSQL

server/index.mts          servidor: sirve dist/ y enruta las funciones
Dockerfile                imagen única (front construido + API)
docker-compose.yml        app + postgres + mailpit
start.sh                  el comando de arriba

netlify/functions/
├── ai-chat.mts           POST /api/ai/chat        proxy + cuota + contabilidad
├── auth-request.mts      POST /api/auth/request   manda el enlace mágico
├── auth-verify.mts       GET  /api/auth/verify    consume el enlace y crea sesión
├── auth-session.mts      GET/POST /api/auth/session   quién soy / cerrar sesión
├── progress.mts          GET/PUT /api/progress    progreso sincronizado
├── quota.mts             GET  /api/quota
├── admin.mts             GET/POST /api/admin      uso, gasto y migración
└── _*.mts                http, db, auth, cuotas y correo
```

## El modelo de seguridad, en corto

**La clave.** Vive solo en `DEEPSEEK_API_KEY`, una variable de entorno del sitio. El navegador
nunca la ve ni puede pedirla. En el bundle del front no hay ningún secreto: compruébalo con
`grep -r "sk-" dist/`.

**El endpoint no es un chatbot libre.** El cliente manda `{kind, payload}` —por ejemplo
`kind: "writing"` con la tarea y el texto—, y quien redacta las instrucciones del modelo es
`shared/prompts.ts` en el servidor. No se puede inyectar un system prompt propio ni usar la API
para otra cosa. Además se validan tipo, tamaño (24 KB por mensaje, 12 turnos) y modelo.

**Tres barreras de gasto**, en `_quota.mts`:

| Barrera | Qué limita | Variable |
|---|---|---|
| Ritmo | llamadas por minuto de un dispositivo o IP | `QUOTA_PER_MINUTE` |
| Persona sin cuenta | correcciones totales, por dispositivo **y** por IP | `QUOTA_ANON_LIFETIME` |
| Persona con cuenta | por día y por mes | `QUOTA_USER_DAILY`, `QUOTA_USER_MONTHLY` |
| Despliegue | tope diario de toda la app | `QUOTA_GLOBAL_DAILY` |

El cupo anónimo se cuenta por dispositivo **y** por IP, y manda el mayor de los dos: borrar el
localStorage no devuelve las llamadas gastadas. El tope global es el que garantiza que la factura
tiene techo pase lo que pase; cuando se alcanza, la app lo dice y sigue funcionando todo lo demás.

**Contabilidad real.** Cada llamada deja una fila en `ai_usage` con los tokens que devolvió
DeepSeek, así que `/api/admin` te dice exactamente cuánto se está gastando y en qué módulos.
La llamada se apunta *antes* de empezar a transmitir: cortar la conexión a mitad no la hace gratis.

**Sesiones.** Enlace mágico de un solo uso, 15 minutos de vida. De los tokens solo se guarda el
SHA-256, tanto del enlace como de la sesión. No hay contraseñas que filtrar. `/api/auth/request`
responde siempre lo mismo exista o no la cuenta, para que nadie descubra qué correos hay
registrados. Hay límite de enlaces por correo y por IP.

**Datos.** Se guarda el correo, el progreso y una fila por llamada con la IP **hasheada con
pimienta** (`IP_PEPPER`), nunca en claro. Nada más: ni analítica, ni perfiles, ni terceros.

**Escape sin servidor.** Quien quiera puede poner su propia clave de DeepSeek en Ajustes: entonces
las peticiones salen de su navegador, no gastan tu cuota y no pasan por tu servidor.

## Desplegar fuera de tu máquina

**Para estudiar tú:** `npm run build` y arrastra la carpeta `dist` a
<https://app.netlify.com/drop>. Sin base de datos, sin claves y sin cuenta: todo
el estudio funciona en el navegador. Las correcciones con IA necesitan servidor,
o tu propia clave de DeepSeek en Ajustes.

**Para compartirla:** `bash desplegar.sh`, que pregunta lo justo y hace el resto
—sitio, variables, publicación, tablas y comprobaciones—. Los pasos, en
**[DESPLIEGUE.md](DESPLIEGUE.md)**. Aquí va el resumen.

Hay dos caminos y el mismo código sirve para los dos: las funciones son handlers estándar
(`Request` → `Response`), y `server/index.mts` se limita a enrutarlas.

### A. Docker en un servidor

```bash
git clone … && cd ruta-b1b2
bash start.sh
```

Después ponlo detrás de nginx, Traefik o Caddy con TLS, y en `.env`:

```
APP_URL=https://ruta.tudominio.com
ALLOWED_ORIGINS=https://ruta.tudominio.com
TRUST_PROXY=true
MAIL_PROVIDER=resend
RESEND_API_KEY=re_…
MAIL_FROM=Ruta B1→B2 <acceso@tudominio.com>
```

**`TRUST_PROXY=true` es obligatorio detrás de un proxy inverso**: sin eso todas las visitas
llegan con la IP del proxy, comparten el mismo cupo anónimo y la primera persona se lo gasta
para todas. Y quita el servicio `mailpit` del compose: es un buzón de desarrollo, no manda
correos de verdad.

### B. Netlify + Neon

Crea la base en [Neon](https://neon.tech), pon `DATABASE_URL`, y `netlify deploy --prod`.
`netlify.toml` ya trae el build, las funciones y las cabeceras. El driver se elige solo:
si `DATABASE_URL` apunta a Neon usa HTTP, y si no, `pg` con pool. Se puede forzar con
`DB_DRIVER=neon|pg`.

### C. Vercel + Neon

Igual, con `vercel --prod`. Las funciones no cambian: `api/[...ruta].ts` es un
adaptador que mira la ruta y llama al handler que toca, y `vercel.json` trae el
build, las cabeceras y los 60 s que necesita el streaming. Si añades un endpoint,
añade también su `import` y su entrada en `RUTAS` de ese archivo.

Después del primer despliegue, en cualquiera de los tres:

```bash
curl -X POST "https://tu-sitio/api/admin?token=$ADMIN_TOKEN&op=schema"   # crea las tablas
curl -s https://tu-sitio/healthz                                          # {"ok":true}
```

## Puesta en marcha manual de la base

### 1. Base de datos

Crea una en [Neon](https://neon.tech) (el plan gratis sobra) y copia la cadena de conexión en
`DATABASE_URL`. Después aplica el esquema, de una de estas dos formas:

```bash
psql "$DATABASE_URL" -f db/schema.sql
# o, ya desplegado:
curl -X POST "https://tu-sitio.netlify.app/api/admin?token=$ADMIN_TOKEN&op=schema"
```

`db/schema.sql` es idempotente: se puede lanzar las veces que haga falta.

### 2. Correo

Cuatro proveedores: `resend`, `postmark`, `smtp` y `log`.

- **Docker** usa `smtp` contra Mailpit: los enlaces se ven en <http://localhost:8025> y no sale
  ningún correo de tu máquina.
- **Producción**: `resend` con `RESEND_API_KEY` es lo más rápido ([resend.com](https://resend.com),
  3.000 correos gratis al mes). `smtp` sirve para cualquier servidor propio.
- **`log`** no envía nada y escribe el enlace en los logs. Solo desarrollo.

Verifica tu dominio en el proveedor y pon `MAIL_FROM` con una dirección de ese dominio, o los
correos acabarán en spam.

### 3. Comprobar que está bien

```bash
grep -r "sk-" dist/ || echo "sin claves en el bundle ✓"
curl -s http://localhost:8080/healthz | jq         # base de datos viva
curl -s http://localhost:8080/api/quota | jq       # cuota anónima
curl -s "http://localhost:8080/api/admin?token=malo"   # debe dar 403
bash start.sh admin                                 # uso y gasto
```

## Vigilar el gasto

La cuota **no cuenta llamadas, cuenta coste**. La unidad es el crédito
(`QUOTA_CREDIT_MICROS`, medio milésimo de dólar por defecto) y cada llamada gasta
los que costó de verdad, calculados con los tokens que devuelve el proveedor:

| Tarea | Coste | Créditos |
|---|---|---|
| Un hueco de Use of English | $0.00025 | 1 |
| Una corrección de writing | $0.0013 | 3 |
| Un writing largo | $0.0029 | 6 |
| Lo mismo con `deepseek-reasoner` | $0.0058 | 12 |
| Generar una lectura | $0.0022 | 5 |

Encima de eso hay un **techo en dólares**: `QUOTA_GLOBAL_DAILY_USD` (3 por defecto).
Al llegar ahí la IA se apaga hasta mañana pase lo que pase. Es lo que evita la
factura sorpresa; el resto de la app sigue funcionando entera.

Si DeepSeek cambia su tarifa, se ajusta con `PRICE_CHAT_IN`, `PRICE_CHAT_OUT`,
`PRICE_REASONER_IN` y `PRICE_REASONER_OUT`, sin tocar código.

```bash
bash start.sh admin
# o, desplegado:  curl -s "https://tu-sitio/api/admin?token=$ADMIN_TOKEN" | jq
```

Lo mismo en pantalla, sin `jq` y desde el móvil: **`/admin.html`**. Pides el
`ADMIN_TOKEN`, lo pegas y ves el gasto, el embudo de abandono, qué módulos abre
la gente y la biblioteca compartida con un botón para ocultar cualquier texto.
El token se queda en esa pestaña (`sessionStorage`) y no se guarda en el
servidor; la página no está enlazada desde ningún sitio ni se indexa.

Devuelve el gasto en dólares por día, por tipo de tarea y por persona, además de
llamadas y tokens. Para subirle la cuota a alguien concreto sin tocar el `.env`:

```sql
-- bash start.sh psql
update users set daily_bonus = 50 where email = 'quien@sea.com';
```

Y para cortar a alguien: `update users set blocked = true where email = '…';`

## Saber dónde abandona la gente

Sin datos, mejorar la app es adivinar. La única telemetría es un **latido
anónimo** (`POST /api/pulse`) que sale una vez al día y lleva cinco cosas: día
del plan, días hechos, racha, ruta y la lista de módulos que esa persona ha
abierto alguna vez.

Lo que no lleva: ni correo, ni `user_id`, ni IP, ni una sola letra de lo que
escribe o corrige. La clave de la tabla `pulse` es un hash con pimienta
(`IP_PEPPER`) del id de dispositivo: sirve para no contar dos veces a la misma
persona y para nada más — no se puede deshacer, y no cruza con `users`.

Con eso, `bash start.sh admin` (o `/admin.html`) responde a la pregunta que
importa: **¿en qué día del plan se cae la gente, y qué módulos no abre nunca?**
Si veinte personas abandonan todas en el día 12, algo pasa en el día 12.

Se apaga por los dos lados:

- En el servidor, `PULSE_ENABLED=false`: el endpoint contesta `{ok:true, off:true}`
  y no guarda nada.
- En el navegador de cada quien, Ajustes → *Estadísticas anónimas* → **Apagar**.
  Es del dispositivo, no de la cuenta, y no afecta a nada más.

## Copias de seguridad

El progreso de todo el mundo vive en una tabla. Si se pierde, se pierden meses de
trabajo de gente que confió en la app.

```bash
bash start.sh backup                       # copia a ./backups, conserva 14
bash start.sh restore backups/ruta-….gz    # la vuelve a cargar
node scripts/backup.mts --list             # qué copias hay
```

Se guardan cuentas, progreso, biblioteca compartida, latidos y consumo. **No** se
guardan las sesiones abiertas ni los enlaces de acceso pendientes: son
temporales y guardarlos solo sería un riesgo. Al restaurar, cada quien vuelve a
entrar con su correo y se encuentra su progreso intacto.

El formato es JSON por líneas comprimido (`.jsonl.gz`), no un volcado de
PostgreSQL: se puede abrir y leer, y se restaura sin `pg_dump` y sin depender de
la versión del servidor. La restauración es idempotente (`on conflict do update`),
así que se puede repetir sin duplicar nada.

Una copia que no está automatizada no existe. Con Docker en un servidor:

```cron
0 3 * * *  cd /ruta/al/proyecto && bash start.sh backup >> backups/cron.log 2>&1
```

En Windows, lo mismo con el Programador de tareas apuntando a
`bash start.sh backup`. Y una vez al mes, prueba a restaurar en una base vacía:
una copia que nunca se ha restaurado es una copia que no sabes si funciona.

En Neon el punto de recuperación en el tiempo ya viene incluido, pero conviene
tener también un archivo tuyo fuera de su infraestructura:

```bash
DATABASE_URL='postgresql://…neon.tech/…' node --experimental-strip-types scripts/backup.mts --out ~/copias
```

## Actualizaciones

`CACHE_VERSION` ya no se toca a mano: `scripts/precache.mts` corre después de cada
`npm run build` y la calcula del contenido del build, además de rellenar la lista
de archivos a precachear (los bundles llevan hash en el nombre, así que no se
pueden listar a mano). Solo hay que subir `APP_VERSION` en
`src/scripts/views/settings.ts` si quieres que se note en la interfaz.

El service worker **nunca** cachea `/api/*`: si lo tocas, mantén esa exclusión o la app se quedará
con una respuesta de sesión antigua pegada.

### Qué se descarga y cuándo

El contenido de cada ruta va en su propio bundle y se trae con `import()`:

| Se descarga | Cuándo | Peso (gzip) |
|---|---|---|
| App y esqueleto | Al abrir | 52 KB |
| La ruta que estudias | Al abrir, antes de pintar | 74–89 KB |
| Sus veinte lecturas | En segundo plano, a los 2,5 s | 43–67 KB |
| La otra ruta | En segundo plano, a los 1,5 s | 74–89 KB |

Quien estudia una ruta no descarga la otra hasta que la app tiene tiempo libre.
En Ajustes hay un botón para bajarlo todo de golpe antes de quedarse sin
cobertura.

## Añadir contenido

Todo el curso está en `src/data/<ruta>/*.ts` con las interfaces en `types.ts`. Una
unidad de gramática nueva es un objeto más en `grammar.ts`; una semana, un objeto
en `weeks.ts`. La lógica de las vistas no se toca. `npm run build` corre
`astro check` antes de compilar, así que un campo mal puesto rompe el build en
vez de fallar en producción.

Cada ruta se ensambla en su `index.ts`, que es lo único que importa `tracks.ts`.
**Añadir una ruta nueva** es crear la carpeta con esos archivos, escribir su
`index.ts` exportando `TRACK` y `cargarLecturas()`, y sumarla a `TRACK_META` y
`CARGADORES` en `src/data/tracks.ts`. Nada más: el reparto en bundles, el
selector del lateral y el progreso por ruta salen solos.

## Sobre `server/laravel/`

Es el proxy de la versión anterior, cuando la clave iba en el cliente y no había cuotas. Ya no se
usa: la API de `netlify/functions/` lo sustituye entera. Puedes borrar esa carpeta.

## TypeScript

`tsconfig.json` extiende `astro/tsconfigs/base` con `strictNullChecks` y `noImplicitAny`
desactivados: las vistas vienen de un port de JavaScript. Lo que sí está tipado del todo es
`src/data/`, `shared/prompts.ts` y todo `netlify/functions/`, que es donde importa.
