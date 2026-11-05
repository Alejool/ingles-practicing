# syntax=docker/dockerfile:1
#
# API: Laravel sobre php-fpm. Contexto de build: la raíz del repositorio
# (lo que entra lo filtra Dockerfile.dockerignore, junto a este archivo).
# En el stack local (docker/compose.yml) el código se monta encima con un volumen;
# el código copiado aquí es el que corre cuando la imagen se usa sin montar.

FROM composer:2.10 AS vendor
WORKDIR /app
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction --prefer-dist
COPY backend/ ./
RUN composer dump-autoload --no-dev --optimize --classmap-authoritative --no-scripts

FROM php:8.4.22-fpm-alpine AS runtime

RUN apk add --no-cache libpq \
 && apk add --no-cache --virtual .build-deps postgresql17-dev \
 && docker-php-ext-install -j"$(nproc)" pdo_pgsql opcache \
 && apk del .build-deps

COPY docker/php/php.ini /usr/local/etc/php/conf.d/zz-ruta.ini
COPY docker/php/www.conf /usr/local/etc/php-fpm.d/zz-ruta.conf

# Workers de fpm: cada stream SSE ocupa uno mientras dura (ver DESPLIEGUE.md).
ENV FPM_MAX_CHILDREN=16

WORKDIR /var/www/html
COPY --from=vendor --chown=www-data:www-data /app /var/www/html

USER www-data
EXPOSE 9000

HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD php -r 'exit(@fsockopen("127.0.0.1", 9000) ? 0 : 1);'

CMD ["php-fpm"]
