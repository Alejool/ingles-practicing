#!/usr/bin/env bash
#
# Ruta B1 → B2 · un comando y está todo en marcha.
#
#   bash start.sh            levanta front, API y base de datos
#   bash start.sh logs       ver los logs en vivo
#   bash start.sh stop       parar (los datos se conservan)
#   bash start.sh restart    reconstruir y volver a levantar
#   bash start.sh reset      BORRAR la base de datos y empezar de cero
#   bash start.sh psql       consola SQL
#   bash start.sh admin      uso y gasto de la IA
#   bash start.sh backup     copia de seguridad de la base de datos
#   bash start.sh restore F  vuelve a cargar una copia
#   bash start.sh test       prueba de humo de todo el stack
#   bash start.sh status     estado de los contenedores
#
set -euo pipefail

cd "$(dirname "$0")"

# ── colores (se apagan solos si la terminal no los admite) ────────────
if [ -t 1 ] && [ "${TERM:-dumb}" != "dumb" ]; then
  B=$'\033[1m'; DIM=$'\033[2m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; C=$'\033[36m'; N=$'\033[0m'
else
  B=""; DIM=""; G=""; Y=""; R=""; C=""; N=""
fi
say()  { printf '%s\n' "$*"; }
ok()   { printf '%s✓%s %s\n' "$G" "$N" "$*"; }
warn() { printf '%s!%s %s\n' "$Y" "$N" "$*"; }
die()  { printf '%s✗%s %s\n' "$R" "$N" "$*" >&2; exit 1; }
step() { printf '\n%s%s%s\n' "$B" "$*" "$N"; }

# ── docker ────────────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || die "No encuentro docker. Instala Docker Desktop: https://docs.docker.com/get-docker/"
docker info >/dev/null 2>&1 || die "Docker está instalado pero no arrancado. Abre Docker Desktop y vuelve a intentarlo."
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  die "Falta el plugin de Docker Compose."
fi

# ── generador de secretos, con tres alternativas ──────────────────────
rand() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
  elif [ -r /dev/urandom ]; then
    LC_ALL=C tr -dc 'a-f0-9' < /dev/urandom | head -c 48
  else
    node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
  fi
}

# Rellena una clave vacía del .env sin tocar el resto del archivo.
fill() {
  local key="$1" value="$2"
  if grep -qE "^${key}=$" .env 2>/dev/null; then
    if [ "$(uname -s)" = "Darwin" ]; then
      sed -i '' "s|^${key}=$|${key}=${value}|" .env
    else
      sed -i "s|^${key}=$|${key}=${value}|" .env
    fi
  fi
}

env_value() { grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- || true; }

setup_env() {
  if [ ! -f .env ]; then
    [ -f .env.docker.example ] || die "Falta .env.docker.example. ¿Estás en la carpeta del proyecto?"
    cp .env.docker.example .env
    ok "Creado .env a partir de .env.docker.example"
  fi
  fill POSTGRES_PASSWORD "$(rand)"
  fill IP_PEPPER         "$(rand)"
  fill ADMIN_TOKEN       "$(rand)"
  ok "Secretos listos en .env"
}

wait_healthy() {
  local port="${1:-8080}" tries=90
  printf '  esperando'
  while [ $tries -gt 0 ]; do
    if curl -fsS "http://127.0.0.1:${port}/healthz" >/dev/null 2>&1; then
      printf '\n'; return 0
    fi
    printf '.'
    sleep 2
    tries=$((tries - 1))
  done
  printf '\n'
  return 1
}

cmd_up() {
  setup_env

  local app_port mail_port key
  app_port="$(env_value APP_PORT)";     app_port="${app_port:-8080}"
  mail_port="$(env_value MAILPIT_PORT)"; mail_port="${mail_port:-8025}"
  key="$(env_value DEEPSEEK_API_KEY)"

  step "Construyendo y levantando"
  $DC up -d --build

  step "Comprobando que responde"
  if wait_healthy "$app_port"; then
    ok "La app responde y la base de datos está al día"
  else
    warn "No respondió a tiempo. Mira los logs:  bash start.sh logs"
    exit 1
  fi

  step "Todo en marcha"
  say "  ${C}App${N}      http://localhost:${app_port}"
  say "  ${C}Correo${N}   http://localhost:${mail_port}   ${DIM}(aquí llegan los enlaces para entrar)${N}"
  say ""
  if [ -z "$key" ]; then
    warn "Sin DEEPSEEK_API_KEY: todo funciona menos las correcciones con IA."
    say "  Ponla en ${B}.env${N} y ejecuta ${B}bash start.sh restart${N}."
    say "  Se saca en https://platform.deepseek.com/api_keys"
  else
    ok "Clave de DeepSeek configurada."
  fi
  say ""
  say "${DIM}Para entrar: escribe tu correo en el módulo 15 · Cuenta y abre el enlace desde el buzón de arriba.${N}"
  say "${DIM}Comprobar que todo va: bash start.sh test   ·   Logs: bash start.sh logs   ·   Parar: bash start.sh stop${N}"
}

case "${1:-up}" in
  up|"")     cmd_up ;;
  restart)   setup_env; $DC up -d --build --force-recreate; wait_healthy "$(env_value APP_PORT || echo 8080)" && ok "Reiniciado" ;;
  stop|down) $DC down && ok "Parado. Los datos siguen ahí; 'bash start.sh' vuelve a levantarlo." ;;
  logs)      $DC logs -f --tail=100 ;;
  status)    $DC ps ;;
  test)
    token="$(env_value ADMIN_TOKEN)"
    say "${DIM}Ejecutando la prueba dentro del contenedor…${N}"
    # -T: sin TTY, para que funcione igual en Git Bash, WSL y CI.
    $DC exec -T \
      -e ADMIN_TOKEN="$token" \
      -e BASE=http://127.0.0.1:8080 \
      -e MAILPIT=http://mailpit:8025 \
      -e FORCE_COLOR=1 \
      ${SMOKE_SKIP_AI:+-e SMOKE_SKIP_AI=$SMOKE_SKIP_AI} \
      app node --experimental-strip-types scripts/smoke.mts
    ;;
  backup)
    # La copia se escribe en ./backups del propio proyecto, que ya está montado
    # en el contenedor: así queda en tu disco y no dentro de Docker.
    mkdir -p backups
    $DC exec -T -e FORCE_COLOR=1 app node --experimental-strip-types scripts/backup.mts \
      --out /app/backups --keep "${BACKUP_KEEP:-14}"
    ok "Copias en ./backups"
    ;;
  restore)
    [ -n "${2:-}" ] || die "Dime qué copia: bash start.sh restore backups/ruta-2026-01-31-0300.jsonl.gz"
    [ -f "$2" ] || die "No encuentro $2"
    printf '%sEsto vuelve a cargar la copia sobre la base actual.%s Escribe SI para continuar: ' "$Y" "$N"
    read -r answer
    [ "$answer" = "SI" ] || die "Cancelado."
    cp -f "$2" "backups/$(basename "$2")" 2>/dev/null || true
    $DC exec -T -e FORCE_COLOR=1 app node --experimental-strip-types scripts/backup.mts \
      --restore "/app/backups/$(basename "$2")"
    ;;
  psql)      $DC exec db psql -U "$(env_value POSTGRES_USER || echo ruta)" -d "$(env_value POSTGRES_DB || echo ruta)" ;;
  admin)
    token="$(env_value ADMIN_TOKEN)"
    port="$(env_value APP_PORT)"; port="${port:-8080}"
    [ -n "$token" ] || die "No hay ADMIN_TOKEN en .env"
    if command -v jq >/dev/null 2>&1; then
      curl -fsS "http://127.0.0.1:${port}/api/admin?token=${token}" | jq
    else
      curl -fsS "http://127.0.0.1:${port}/api/admin?token=${token}"; echo
    fi
    ;;
  reset)
    printf '%sEsto borra la base de datos: cuentas, progreso y consumo.%s Escribe BORRAR para confirmar: ' "$R" "$N"
    read -r answer
    [ "$answer" = "BORRAR" ] || die "Cancelado."
    $DC down -v && ok "Base de datos borrada. Ejecuta 'bash start.sh' para empezar de cero."
    ;;
  *) die "Comando desconocido: $1. Usa: up | logs | stop | restart | test | psql | admin | backup | restore | status | reset" ;;
esac
