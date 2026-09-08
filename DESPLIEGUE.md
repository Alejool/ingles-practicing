# Poner la app en internet

## Primero: ¿para ti, o para más gente?

Son dos cosas muy distintas y la primera es de dos minutos.

### A · Solo para estudiar tú

No hace falta base de datos, ni cuenta, ni claves, ni el script. La app entera
—las 120 sesiones del plan, la gramática, el vocabulario con repetición
espaciada, las lecturas, los simulacros, el dictado, las pruebas— vive en el
navegador y funciona sin servidor.

```bash
npm run build
```

Eso deja una carpeta `dist`. Abre <https://app.netlify.com/drop> y **arrastra
`dist` a la ventana**. En treinta segundos tienes una dirección tuya, con HTTPS,
que puedes abrir en el móvil e instalar como app. Sin registrarte siquiera para
probarlo (para conservar el sitio sí te pedirá cuenta gratis).

Lo único que no va así son las correcciones con IA, y la app te lo dice con esas
palabras en lugar de dar un error. Dos salidas:

- **Tu propia clave**: Ajustes → *Avanzado* → pegas tu API key de DeepSeek. Sale
  de tu navegador directamente a DeepSeek, pagas tú y no hay servidor de por
  medio. Para estudiar tú solo, es lo más simple que hay.
- **Un servidor de verdad**: eso es el camino B.

Para actualizar, `npm run build` y vuelves a arrastrar `dist`. El progreso de
quien ya la usaba no se toca: vive en su dispositivo.

### B · Para compartirla con otras personas

Aquí sí hace falta lo demás: base de datos para las cuentas y el progreso,
correo para el enlace de acceso, y los límites de gasto para que nadie te vacíe
la cuenta de DeepSeek. Un comando:

```bash
bash desplegar.sh
```

Va preguntando y hace el resto: instala lo que falte, crea el sitio, genera tus
secretos, configura las variables, publica, crea las tablas y comprueba que
quedó bien. Lo que aportas tú son dos registros gratis —Neon para la base,
Resend para el correo— y pegar sus claves cuando las pida.

Cuando termine te deja la dirección de la app, la del panel de administración y
un `.despliegue.txt` con tus dos secretos.

---

El resto de este documento es para entender qué hace el camino B, o para hacerlo
a mano.

Checklist para dejarla funcionando en un dominio, compartirla y no llevarte
sustos. Todo lo que hay que **decidir** ya está decidido; lo único que tienes
que aportar son cuatro claves. Cuarenta minutos la primera vez.

Elige un camino:

- **A · Netlify + Neon** — sin servidor que mantener, plan gratis suficiente
  para decenas de personas. Es el recomendado si vas a compartirla y ya está.
- **B · Vercel + Neon** — lo mismo, si prefieres Vercel. `api/[...ruta].ts` es un
  adaptador de veinte líneas: las funciones no cambian.
- **C · Docker en un VPS** — un servidor tuyo, cinco euros al mes, control total.
- **D · Sin base de datos externa** — la base es una carpeta de tu disco. Cero
  servicios, cero registros; a cambio, un solo proceso y las copias con la app
  parada. Es el camino para empezar hoy y decidir después.

El mismo código sirve para los tres: las funciones de `netlify/functions` son
handlers estándar de la web (`Request` → `Response`). Netlify las coge tal cual,
Vercel a través del adaptador y Docker con `server/index.mts`.

---

## Antes de empezar: las cuatro claves

Consíguelas primero y déjalas en un bloc de notas. Son las únicas cosas que este
documento no puede hacer por ti.

| Qué | Dónde | Para qué | ¿Obligatoria? |
|---|---|---|---|
| `DATABASE_URL` | [neon.tech](https://neon.tech) → *Connection string* | Cuentas y progreso | Sí, salvo en el camino D |
| `DEEPSEEK_API_KEY` | [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys) | Correcciones con IA | Sí |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → *API Keys* | Enlace de acceso por correo | Sí |
| Un dominio | Donde lo tengas | `APP_URL` y el remitente del correo | Recomendable |

En Resend, **verifica el dominio** (te da tres registros DNS que copiar) antes de
mandar nada: sin eso los correos van a spam y la gente no podrá entrar. Si aún no
tienes dominio, Resend deja mandar desde `onboarding@resend.dev` para probar.

Estas dos las genera tu máquina, no las inventes a mano:

```bash
openssl rand -hex 32   # → ADMIN_TOKEN
openssl rand -hex 32   # → IP_PEPPER
```

`IP_PEPPER` no se cambia nunca después: si la cambias, se reinician los cupos
anónimos y los latidos dejan de casar con los de antes.

---

## A · Netlify + Neon

### 1. La base de datos

En [neon.tech](https://neon.tech): *New project* → región cerca de tu gente →
copia la *Connection string* (la que acaba en `?sslmode=require`).

### 2. El sitio

```bash
npm i -g netlify-cli
netlify login
netlify init          # enlaza la carpeta con un sitio nuevo
```

`netlify.toml` ya trae el build, las funciones y las cabeceras: no hay que
configurar nada en el panel.

### 3. Las variables

Pega tus claves aquí y ejecútalo entero:

```bash
netlify env:set DATABASE_URL      'postgresql://…neon.tech/…?sslmode=require'
netlify env:set DEEPSEEK_API_KEY  'sk-…'
netlify env:set RESEND_API_KEY    're_…'
netlify env:set ADMIN_TOKEN       'el-hex-de-32-bytes'
netlify env:set IP_PEPPER         'el-otro-hex-de-32-bytes'

netlify env:set APP_URL           'https://ruta.tudominio.com'
netlify env:set ALLOWED_ORIGINS   'https://ruta.tudominio.com'
netlify env:set MAIL_PROVIDER     'resend'
netlify env:set MAIL_FROM         'Ruta B1→B2 <acceso@tudominio.com>'
```

Los límites de gasto tienen valores por defecto razonables (3 $/día de techo).
Si quieres otros, están todos comentados en `.env.example`; se ponen igual.

### 4. Publicar y crear las tablas

```bash
netlify deploy --prod
curl -X POST "https://ruta.tudominio.com/api/admin?token=$ADMIN_TOKEN&op=schema"
```

Ese `curl` devuelve `Esquema aplicado (N sentencias)`. Es idempotente: se puede
repetir sin miedo cada vez que actualices.

### 5. El dominio

En el panel de Netlify: *Domain settings* → *Add custom domain* → sigue los pasos
de DNS. El certificado HTTPS lo pone Netlify solo. Cuando esté, comprueba que
`APP_URL` y `ALLOWED_ORIGINS` apuntan exactamente a ese dominio (con `https://`,
sin barra final).

---

## B · Vercel + Neon

### 1. La base de datos

Igual que en Netlify: crea el proyecto en [neon.tech](https://neon.tech) y copia
la *Connection string*. Si prefieres no salir de Vercel, en *Storage* → *Create
Database* → *Neon* te la crea y te pone `DATABASE_URL` sola.

### 2. El proyecto

```bash
npm i -g vercel
vercel login
vercel link
```

`vercel.json` ya trae el build, las cabeceras y la duración de las funciones (60 s,
que las correcciones llegan por streaming). No hay que tocar nada en el panel:
como *Framework Preset* deja **Other**.

### 3. Las variables

```bash
vercel env add DATABASE_URL      production   # pega la cadena de Neon
vercel env add DEEPSEEK_API_KEY  production
vercel env add RESEND_API_KEY    production
vercel env add ADMIN_TOKEN       production
vercel env add IP_PEPPER         production
vercel env add APP_URL           production   # https://ruta.tudominio.com
vercel env add ALLOWED_ORIGINS   production
vercel env add MAIL_PROVIDER     production   # resend
vercel env add MAIL_FROM         production
```

Cada comando pide el valor por teclado, así que las claves no se quedan en el
historial de la terminal. Se pueden pegar también desde *Settings → Environment
Variables*.

### 4. Publicar y crear las tablas

```bash
vercel --prod
curl -X POST "https://ruta.tudominio.com/api/admin?token=$ADMIN_TOKEN&op=schema"
```

### 5. El dominio

*Settings → Domains → Add*. El certificado lo pone Vercel. Después revisa que
`APP_URL` y `ALLOWED_ORIGINS` apunten exactamente a ese dominio y vuelve a
desplegar (las variables se leen en el arranque de la función).

### Si añades un endpoint

En Netlify basta con dejar el archivo en `netlify/functions/`. En Vercel hay que
añadir además dos líneas en `api/[...ruta].ts`: el `import` y su entrada en
`RUTAS`. Es a propósito — leer la carpeta en tiempo de ejecución haría que el
empaquetador no incluyera los archivos y en producción no habría ninguna ruta.

## C · Docker en un VPS

### 1. El servidor

Cualquiera con 1 GB de RAM sirve. Instala Docker y clona el proyecto:

```bash
curl -fsSL https://get.docker.com | sh
git clone … && cd ingles
bash start.sh
```

`start.sh` crea el `.env` con secretos generados y levanta base de datos, API y
front. En este punto ya funciona en `http://IP:8080`.

### 2. Las claves

Edita `.env` y pon las tuyas:

```
DEEPSEEK_API_KEY=sk-…
MAIL_PROVIDER=resend
RESEND_API_KEY=re_…
MAIL_FROM=Ruta B1→B2 <acceso@tudominio.com>
APP_URL=https://ruta.tudominio.com
ALLOWED_ORIGINS=https://ruta.tudominio.com
TRUST_PROXY=true
```

**`TRUST_PROXY=true` no es opcional detrás de un proxy inverso.** Sin eso todas
las visitas llegan con la IP del proxy, comparten el mismo cupo anónimo y la
primera persona se lo gasta para todas.

Quita también el servicio `mailpit` del `docker-compose.yml`: es un buzón de
desarrollo, no manda correos de verdad.

### 3. TLS

Caddy es lo más corto que hay. Un `Caddyfile`:

```
ruta.tudominio.com {
    reverse_proxy 127.0.0.1:8080
}
```

Certificado y renovación, automáticos. Después: `bash start.sh restart`.

### 4. Copias de seguridad

```bash
mkdir -p backups
bash start.sh backup
crontab -e
# 0 3 * * *  cd /ruta/al/proyecto && bash start.sh backup >> backups/cron.log 2>&1
```

Y baja de vez en cuando el `.jsonl.gz` a otra máquina: una copia que vive en el
mismo disco que la base no es una copia.

---

## D · Sin base de datos externa (pglite)

Para cuando no quieres crear una cuenta en Neon todavía. La base pasa a ser una
carpeta: Postgres compilado a WASM, dentro del propio proceso.

**Dónde funciona:** tu máquina, un VPS, un mini-PC en casa, un Raspberry Pi.
**Dónde no:** Netlify y Vercel. Allí el disco se borra en cada llamada y la base
desaparecería con ella; no es una limitación de esta app sino de cómo funcionan
las funciones sin servidor.

```bash
npm install
npm run build
npm run start:local          # http://localhost:8080, base en ./data/pglite
```

Sin `.env`, sin PostgreSQL instalado y sin Docker. Para que además corrija con
IA y mande correos, un `.env` con lo mínimo:

```
DB_DRIVER=pglite
PGLITE_DIR=./data/pglite
DEEPSEEK_API_KEY=sk-…
APP_URL=https://ruta.tudominio.com
ALLOWED_ORIGINS=https://ruta.tudominio.com
TRUST_PROXY=true
MAIL_PROVIDER=resend
RESEND_API_KEY=re_…
MAIL_FROM=Ruta B1→B2 <acceso@tudominio.com>
ADMIN_TOKEN=…
IP_PEPPER=…
```

Delante, Caddy con TLS igual que en el camino C, y el proceso bajo `systemd` o
`pm2` para que vuelva solo si se cae.

### Lo que cambia respecto a Postgres

- **Un solo proceso.** La base vive dentro del que la abre. Nada de `pm2 -i 4` ni
  dos réplicas: el arranque pone un cerrojo (`data/pglite/en-uso.json`) y el
  segundo proceso se niega a entrar, porque abrirla dos veces la deja
  inservible. Un `kill -9` sí lo aguanta: los datos siguen ahí.
- **Copias con la app parada**, unos segundos:

  ```bash
  bash start.sh stop  &&  node scripts/backup.mts  &&  bash start.sh
  ```

  Con `systemd`: `systemctl stop ruta && node scripts/backup.mts && systemctl start ruta`.
- **Guarda la carpeta `data/`** como guardarías la base: es todo lo que hay.

### Pasar a Postgres el día que quieras

No se toca ni una consulta: pglite habla el mismo SQL.

```bash
node scripts/backup.mts                    # con la app parada
DATABASE_URL='postgresql://…' node scripts/backup.mts --restore backups/ruta-….jsonl.gz
```

Después, `DATABASE_URL` en el entorno, quita `DB_DRIVER`, y a correr. A partir de
ahí ya puedes desplegar en Netlify o en Vercel con el mismo repositorio.

## Comprobar que quedó bien

Da igual el camino que hayas seguido. Cinco comprobaciones, dos minutos:

```bash
BASE=https://ruta.tudominio.com

curl -s $BASE/healthz                          # {"ok":true} → la base responde
curl -s $BASE/api/quota                        # cuota anónima
curl -s "$BASE/api/admin?token=incorrecto"     # 403, no 200
curl -s $BASE/ | grep -o 'sk-[A-Za-z0-9]\{16,\}' || echo "sin claves en el HTML ✓"
```

Y la prueba de humo completa, que recorre el stack entero (front, cuota, enlace
mágico, progreso, latido, administración) y limpia lo que crea:

```bash
BASE=$BASE ADMIN_TOKEN=… node --experimental-strip-types scripts/smoke.mts
# con Docker:  bash start.sh test
```

A mano, lo que de verdad importa:

1. Abre la app en el móvil, pide el enlace con tu correo y entra desde ahí.
2. Corrige un writing: debe llegar la respuesta a trozos, no de golpe.
3. Ponte en modo avión y navega: el plan, el vocabulario y las lecturas siguen.
4. Instálala (menú → *Instalar aplicación*) y ábrela cerrando el navegador.
5. Entra en `https://ruta.tudominio.com/admin.html` con tu `ADMIN_TOKEN` y mira
   que el gasto de esas pruebas aparece ahí.

---

## Antes de compartir el enlace

- **El techo de gasto está puesto.** `QUOTA_GLOBAL_DAILY_USD=3` por defecto: la
  IA se apaga hasta mañana al llegar ahí y el resto de la app sigue entera. Súbelo
  o bájalo, pero no lo pongas a 0 salvo que quieras un límite sólo por créditos.
- **Mira el gasto el primer día.** `/admin.html` o `bash start.sh admin`. Con diez
  personas estudiando a diario, la factura real anda por unos céntimos al día.
- **La clave de DeepSeek nunca sale al navegador.** Está comprobado en la prueba
  de humo, pero compruébalo tú también: `curl -s $BASE/ | grep sk-`.
- **Quien quiera puede poner su propia clave** en Ajustes → *Avanzado*, y entonces
  no te gasta nada. Es lo que le dirías a alguien que vaya a usarla mucho.
- **La biblioteca compartida es pública para quien tenga el enlace.** Los textos
  que genera una persona los ven las demás. Si aparece algo raro, se oculta con un
  botón en `/admin.html`.
- **Ten una copia de seguridad hecha antes** de que entre nadie, para saber que el
  proceso funciona.

## Actualizar más adelante

```bash
git pull
netlify deploy --prod                 # camino A
vercel --prod                         # camino B
bash start.sh restart                 # camino C
curl -X POST "$BASE/api/admin?token=$ADMIN_TOKEN&op=schema"   # si cambió el esquema
```

`CACHE_VERSION` se calcula sola en cada build, así que a la gente le sale el
aviso de *«Hay una versión nueva»* y actualiza con un clic. El progreso no se
toca: vive en la base y en su dispositivo.

## Si algo falla

| Síntoma | Casi siempre es |
|---|---|
| `healthz` responde `{"ok":false}` | `DATABASE_URL` mal, o faltan las tablas (`op=schema`) |
| El correo no llega | Dominio sin verificar en Resend, o `MAIL_FROM` de otro dominio |
| El enlace del correo lleva a `localhost` | `APP_URL` sin actualizar |
| «No autorizado» al corregir, en el navegador | `ALLOWED_ORIGINS` no coincide exactamente |
| Todo el mundo comparte el mismo cupo | Falta `TRUST_PROXY=true` |
| `/api/admin` devuelve 404 | No hay `ADMIN_TOKEN` en el entorno |
| Con pglite, «ya la está usando otro proceso» | Hay otra instancia abierta sobre `data/pglite`; para la app antes de la copia |
| Con pglite en Netlify o Vercel, los datos se pierden | Ahí no hay disco que persista: usa Postgres |
| En Vercel, todo `/api/*` da 404 | El *Framework Preset* no es **Other**, o falta la carpeta `api/` en el repo |
| En Vercel, la corrección se corta a los 10 s | El plan gratis limita la duración: `maxDuration` en `vercel.json` solo sube hasta lo que permita tu plan |
| La IA responde `provider_no_credit` | La cuenta de DeepSeek se quedó sin saldo |
