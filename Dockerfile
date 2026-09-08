# syntax=docker/dockerfile:1
#
# Una sola imagen: front construido con Astro + API + servidor que sirve las dos cosas.
# Node ejecuta los .mts directamente (type stripping), así que no hay paso de
# compilación para el servidor: el código que corre aquí es el mismo que en Netlify.

# ── 1. build del front ───────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
ENV npm_config_update_notifier=false
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY . .
RUN npm run build

# ── 2. dependencias de producción ────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
ENV npm_config_update_notifier=false
COPY package.json package-lock.json* ./
RUN (npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund) \
 && npm cache clean --force

# ── 3. imagen final ──────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8080 \
    HOST=0.0.0.0 \
    NODE_OPTIONS=--enable-source-maps

RUN apk add --no-cache tini curl

COPY --from=deps  /app/node_modules ./node_modules
COPY --from=build /app/dist         ./dist
COPY package.json ./
COPY db     ./db
COPY shared ./shared
COPY netlify ./netlify
COPY server  ./server
COPY scripts ./scripts

USER node
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=6 \
  CMD curl -fsS http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--experimental-strip-types", "server/index.mts"]
