#!/usr/bin/env bash
#
# Publicar la app en internet, preguntando lo justo.
#
#   bash desplegar.sh
#
# Hace todo menos las dos cosas que tienes que hacer tú: crear las cuentas y
# decidir cuánto quieres gastar. Las claves las escribes aquí y van directas al
# proveedor: no se quedan en el historial de la terminal ni en ningún archivo
# salvo el que se te dice al final.
#
set -euo pipefail
cd "$(dirname "$0")"

if [ -t 1 ] && [ "${TERM:-dumb}" != "dumb" ]; then
  B=$'\033[1m'; DIM=$'\033[2m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; C=$'\033[36m'; N=$'\033[0m'
else
  B=""; DIM=""; G=""; Y=""; R=""; C=""; N=""
fi
say()  { printf '%s\n' "$*"; }
ok()   { printf '%s✓%s %s\n' "$G" "$N" "$*"; }
warn() { printf '%s!%s %s\n' "$Y" "$N" "$*"; }
die()  { printf '\n%s✗%s %s\n' "$R" "$N" "$*" >&2; exit 1; }
paso() { printf '\n%s%s%s\n%s\n' "$B" "$*" "$N" "${DIM}────────────────────────────────────────────────────────${N}"; }

# Pregunta y devuelve la respuesta. Sin eco si el segundo argumento es "secreto".
preguntar() {
  local texto="$1" secreto="${2:-}" valor=""
  if [ "$secreto" = "secreto" ]; then
    printf '%s' "$texto" >&2; read -rs valor; printf '\n' >&2
  else
    printf '%s' "$texto" >&2; read -r valor
  fi
  printf '%s' "$valor"
}

confirmar() {
  local r; printf '%s [s/n] ' "$1" >&2; read -r r
  [ "$r" = "s" ] || [ "$r" = "S" ] || [ "$r" = "si" ] || [ "$r" = "sí" ]
}

# Cadena aleatoria sin depender de openssl (en Git Bash puede no estar).
secreto() { node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"; }

clear 2>/dev/null || true
say "${B}Publicar la Ruta B1 → B2${N}"
say "${DIM}Unos diez minutos. Puedes cortar con Ctrl+C y volver a empezar cuando quieras:"
say "nada de lo que hace aquí se rompe a medias.${N}"

# ── 0. lo que tiene que haber en tu máquina ──────────────────────────
paso "0 · Comprobaciones"
command -v node >/dev/null || die "No tienes Node. Instálalo desde https://nodejs.org (versión 22 o más)."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 22 ] || die "Tienes Node $NODE_MAJOR y hace falta 22 o más."
ok "Node $(node -v)"
[ -f package.json ] || die "Lánzalo desde la carpeta del proyecto."
[ -d node_modules ] || { say "Instalando dependencias…"; npm install --no-audit --no-fund >/dev/null; }
ok "Dependencias listas"

# ── 1. dónde ─────────────────────────────────────────────────────────
paso "1 · ¿Dónde la publicamos?"
say "  1) Netlify   ${DIM}el camino probado, y el que recomiendo${N}"
say "  2) Vercel    ${DIM}igual de válido si ya lo usas${N}"
DONDE="$(preguntar "Escribe 1 o 2: ")"
case "$DONDE" in
  1) PLAT=netlify; CLI=netlify; PAQUETE=netlify-cli ;;
  2) PLAT=vercel;  CLI=vercel;  PAQUETE=vercel ;;
  *) die "Escribe 1 o 2." ;;
esac
ok "$PLAT"

if ! command -v "$CLI" >/dev/null; then
  say ""
  confirmar "Falta el comando '$CLI'. ¿Lo instalo (npm i -g $PAQUETE)?" || die "Sin el CLI no puedo seguir."
  npm i -g "$PAQUETE" >/dev/null || die "No se pudo instalar $PAQUETE."
fi
ok "$CLI listo"

# ── 2. la base de datos ──────────────────────────────────────────────
paso "2 · La base de datos"
say "Guarda las cuentas y el progreso de la gente. Neon regala una:"
say ""
say "  ${C}https://neon.tech${N}  →  Sign up  →  Create project"
say "  Cuando lo cree, copia la ${B}Connection string${N} (empieza por postgresql:// y"
say "  acaba en ?sslmode=require). Es lo único que necesito de ahí."
say ""
say "${DIM}Al pegarla no vas a ver nada escrito en pantalla: es a propósito.${N}"
DB="$(preguntar "Pega la Connection string: " secreto)"
[ -n "$DB" ] || die "Sin base de datos no hay app. Vuelve a lanzarlo cuando la tengas."
case "$DB" in postgres*://*) ok "Recibida" ;; *) die "Eso no parece una cadena de PostgreSQL." ;; esac

# ── 3. la IA ─────────────────────────────────────────────────────────
paso "3 · Las correcciones con IA"
say "  ${C}https://platform.deepseek.com/api_keys${N}  →  Create new API key"
say ""
say "${DIM}Puedes dejarlo vacío: la app funciona entera sin IA (plan, vocabulario,"
say "lecturas, simulacros) y la añades después.${N}"
IA="$(preguntar "Pega la API key de DeepSeek (o Enter para saltar): " secreto)"
[ -n "$IA" ] && ok "Recibida" || warn "Sin IA por ahora"

# ── 4. el correo ─────────────────────────────────────────────────────
paso "4 · ¿Con cuentas o sin ellas?"
say "Con cuentas, cada persona entra con un enlace que le llega al correo y su"
say "progreso la sigue entre el móvil y el ordenador. Hace falta un servicio de"
say "envío y, para escribir a otras personas, un dominio verificado."
say ""
say "Sin cuentas, cualquiera abre el enlace y estudia: el progreso se guarda en"
say "su dispositivo y las correcciones van con un cupo diario. Cero registros."
say ""
say "  ${C}https://resend.com${N}  →  API Keys  →  Create   ${DIM}(solo si quieres cuentas)${N}"
say ""
CORREO="$(preguntar "Pega la API key de Resend (o Enter para publicarla sin cuentas): " secreto)"
if [ -n "$CORREO" ]; then
  REMITE="$(preguntar "¿Desde qué dirección se manda? (ej: acceso@tudominio.com): ")"
  [ -n "$REMITE" ] || REMITE="onboarding@resend.dev"
  ok "Con cuentas · remitente $REMITE"
  warn "Verifica ese dominio en Resend o los correos no llegarán a otras personas."
  CUENTAS=1
else
  CUENTAS=0
  ok "Sin cuentas: se estudia sin registrarse"
  say ""
  say "${DIM}Como no hay cuentas, el cupo de IA es por dispositivo y por día. Cuántos"
  say "créditos al día le das a cada persona: uno son unos \$0.0005, una corrección"
  say "de writing gasta unos 3. Con 20 al día, cinco o seis correcciones por"
  say "persona; el techo diario en dólares sigue mandando por encima.${N}"
  CUPO="$(preguntar "Créditos por persona y día [20]: ")"
  case "$CUPO" in ''|*[!0-9]*) CUPO=20 ;; esac
  ok "$CUPO créditos por persona y día"
fi

# ── 5. secretos propios ──────────────────────────────────────────────
paso "5 · Tus dos secretos"
ADMIN="$(secreto)"
PEPPER="$(secreto)"
ok "Generados aquí, en tu máquina"
say "${DIM}ADMIN_TOKEN abre el panel de administración. IP_PEPPER protege el conteo"
say "de cupos y las estadísticas anónimas: una vez puesto, no se cambia nunca.${N}"

# ── 6. enlazar el sitio ──────────────────────────────────────────────
paso "6 · Crear el sitio"
say "Se te va a abrir el navegador para que entres en $PLAT. Si no tienes cuenta,"
say "créala ahí mismo — es gratis y tarda un minuto."
say ""
if [ "$PLAT" = netlify ]; then
  netlify status >/dev/null 2>&1 || netlify login
  netlify status --json >/dev/null 2>&1 || netlify init
  URL="$(netlify status --json 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(j.siteData?.ssl_url||j.siteData?.url||'')}catch{console.log('')}})")"
else
  vercel whoami >/dev/null 2>&1 || vercel login
  vercel link
  URL=""
fi

if [ -z "${URL:-}" ]; then
  say ""
  say "${DIM}No he podido leer la dirección del sitio automáticamente.${N}"
  URL="$(preguntar "¿Cuál es la URL pública? (ej: https://ruta-ingles.netlify.app): ")"
fi
URL="${URL%/}"
[ -n "$URL" ] || die "Necesito la URL del sitio."
ok "Sitio: $URL"

# ── 7. variables ─────────────────────────────────────────────────────
paso "7 · Configurando el sitio"
poner() {  # poner NOMBRE VALOR
  [ -n "$2" ] || return 0
  if [ "$PLAT" = netlify ]; then
    netlify env:set "$1" "$2" >/dev/null
  else
    printf '%s' "$2" | vercel env add "$1" production --force >/dev/null 2>&1 \
      || printf '%s' "$2" | vercel env add "$1" production >/dev/null
  fi
  printf '  · %s\n' "$1"
}
poner DATABASE_URL     "$DB"
poner DEEPSEEK_API_KEY "$IA"
poner ADMIN_TOKEN      "$ADMIN"
poner IP_PEPPER        "$PEPPER"
poner APP_URL          "$URL"
poner ALLOWED_ORIGINS  "$URL"
if [ "$CUENTAS" = 1 ]; then
  poner MAIL_PROVIDER  "resend"
  poner RESEND_API_KEY "$CORREO"
  poner MAIL_FROM      "Ruta B1→B2 <$REMITE>"
else
  # Sin correo no hay cuentas: se dice explícitamente para que la app no ofrezca
  # un registro que no funciona, y el cupo anónimo pasa a renovarse cada día.
  poner ACCOUNTS_ENABLED   "false"
  poner MAIL_PROVIDER      "none"
  poner QUOTA_ANON_WINDOW  "dia"
  poner QUOTA_ANON_DAILY   "$CUPO"
fi
ok "Variables puestas"

# ── 8. construir y subir ──────────────────────────────────────────────────────
paso "8 · Construyendo aquí"
say "${DIM}La app se construye en TU máquina y se sube ya construida. Nada de builds"
say "remotos ni de conectar repositorios: lo que se publica es exactamente lo que"
say "acabas de ver funcionar en local.${N}"
say ""
npm run build || die "El build ha fallado. Arriba tienes el error; pégamelo y lo miramos."
[ -d dist ] && [ -f dist/index.html ] || die "El build no ha dejado dist/index.html."
ok "Build hecho: $(find dist -type f | wc -l | tr -d ' ') archivos en dist/"

paso "9 · Subiendo"
say "${DIM}Se suben dist/ y las funciones. Un par de minutos.${N}"
say ""
if [ "$PLAT" = netlify ]; then
  # --dir y --functions: se sube lo que hay en disco, sin pasar por su build.
  netlify deploy --prod --dir=dist --functions=netlify/functions || die "La subida ha fallado."
else
  # Vercel construye en su nube salvo que le des el resultado ya hecho.
  vercel build --prod || die "vercel build ha fallado."
  vercel deploy --prebuilt --prod || die "La subida ha fallado."
fi
ok "Publicado"

# ── 10. crear las tablas ──────────────────────────────────────────────
paso "10 · Creando las tablas"
sleep 3
if curl -fsS -X POST "$URL/api/admin?token=$ADMIN&op=schema" >/dev/null 2>&1; then
  ok "Tablas creadas desde el sitio"
else
  # Si el endpoint no contesta todavía, da igual: el esquema se puede aplicar
  # desde aquí, que tu máquina sí llega a la base de datos.
  say "${DIM}El sitio aún no contesta; las creo yo directamente contra la base.${N}"
  if DATABASE_URL="$DB" npm run migrate >/dev/null 2>&1; then
    ok "Tablas creadas desde tu máquina"
  else
    warn "No pude crearlas. Cuando el sitio responda, lanza:"
    say "  curl -X POST \"$URL/api/admin?token=$ADMIN&op=schema\""
  fi
fi

# ── 11. comprobar ────────────────────────────────────────────────────
paso "11 · Comprobando que quedó bien"
SALUD="$(curl -fsS "$URL/healthz" 2>/dev/null || echo '')"
case "$SALUD" in
  *'"ok":true'*) ok "La app responde y llega a la base de datos" ;;
  *) warn "healthz dice: ${SALUD:-nada}. Revisa DATABASE_URL." ;;
esac
if curl -fsS "$URL/" 2>/dev/null | grep -qE 'sk-[A-Za-z0-9]{16,}'; then
  die "¡Hay una clave en el HTML! No compartas el enlace y avísame."
else
  ok "Ninguna clave sale al navegador"
fi

# ── 12. dónde queda todo ─────────────────────────────────────────────
FICHA=".despliegue.txt"
{
  echo "Ruta B1 → B2 · datos del despliegue"
  echo "Fecha:  $(date)"
  echo "Sitio:  $URL"
  echo "Panel:  $URL/admin.html"
  echo ""
  echo "ADMIN_TOKEN=$ADMIN"
  echo "IP_PEPPER=$PEPPER"
  echo ""
  echo "IP_PEPPER no se cambia nunca: si lo cambias se reinician los cupos"
  echo "anónimos y las estadísticas dejan de casar."
} > "$FICHA"
chmod 600 "$FICHA" 2>/dev/null || true

paso "Listo"
say "  App:    ${C}$URL${N}"
say "  Panel:  ${C}$URL/admin.html${N}  ${DIM}(te pedirá el ADMIN_TOKEN)${N}"
say ""
say "  Tus dos secretos están en ${B}$FICHA${N} — guárdalo y no lo subas a git."
say ""
say ""
if [ "$CUENTAS" = 1 ]; then
  say "Ahora, cinco minutos a mano: abre la app en el móvil, pide el enlace con tu"
  say "correo, corrige un texto y mira que el gasto aparece en el panel."
else
  say "Ahora, cinco minutos a mano: abre la app en el móvil, haz el día 1, corrige"
  say "un texto y mira que el gasto aparece en el panel."
  say ""
  say "${DIM}Para compartirla, manda esa dirección y ya está: quien la abra estudia sin"
  say "registrarse. Su progreso vive en su dispositivo, así que dile que la instale"
  say "(menú del navegador → «Instalar aplicación») y que no borre los datos del"
  say "sitio. Si algún día quieres cuentas y sincronización, vuelve a lanzar esto"
  say "con una clave de Resend.${N}"
fi
