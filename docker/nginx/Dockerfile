# syntax=docker/dockerfile:1
#
# Web: nginx sirve el front de Astro y pasa /api/* y /healthz a php-fpm.
# Contexto de build: la raíz del repositorio (filtrado por Dockerfile.dockerignore).

FROM node:22-alpine AS front
WORKDIR /app
ENV npm_config_update_notifier=false
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Mismo origen para el front y la API: sin base propia ni CORS.
ENV PUBLIC_API_BASE=""
RUN npm run build

FROM nginx:1.29.3-alpine AS runtime
RUN rm /etc/nginx/conf.d/default.conf
COPY docker/nginx/default.conf /etc/nginx/conf.d/ruta.conf
COPY docker/nginx/headers.conf docker/nginx/fastcgi-api.conf /etc/nginx/ruta/
COPY --from=front /app/dist /usr/share/nginx/html

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1/healthz >/dev/null || exit 1
