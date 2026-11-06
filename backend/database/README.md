# Base de datos

Las siete migraciones `2026_11_05_00000{1..7}` (`users`, `login_tokens`, `sessions`,
`ai_usage`, `progress`, `shared_readings`, `pulse`) repiten, tabla por tabla y en el
mismo orden, las sentencias idempotentes de `db/schema.sql`: `create table if not exists`,
las `alter table … add column if not exists` y `create index if not exists`.

Así se adopta una base existente (Neon) sin alterarla: `php artisan migrate` hace lo
mismo que volver a pasar `schema.sql`. En una base al día no cambia nada y solo registra
las siete en `migrations`; en una base anterior a `return_to` o `cost_micros`, o a la que
le falte un índice, añade solo eso; en una base vacía crea el esquema entero. Nunca
borra ni cambia columnas ni filas.

## Reglas

- **Solo se añaden migraciones.** Las siete base no se editan: un cambio de esquema es
  una migración nueva, aditiva e idempotente.
- `down()` está vacío a propósito: ninguna migración borra una tabla con datos.
- Prohibido en cualquier base que no sea desechable: `migrate:fresh`, `migrate:refresh`,
  `migrate:reset`, `migrate:rollback`, `db:wipe`, `DROP`, `TRUNCATE`.
- `migrate --force` contra producción lo lanza una persona, con autorización
  (ver `DESPLIEGUE.md`).

## Tests

`tests/Feature/Database/` comprueba sin dejar rastro:

- `SchemaParityTest`: las migraciones sobre un esquema vacío dan lo mismo que `schema.sql`
  (columnas y su orden, defectos, restricciones, índices, secuencias).
- `AdoptionTest`: sobre una base al día con datos, migrate no cambia ni esquema ni filas;
  sobre una base antigua (sin `return_to`, `cost_micros` ni `ai_usage_ip_idx`) con datos,
  migrate la deja igual que `schema.sql` y las filas no cambian.

Todo ocurre en esquemas con nombre único dentro de una transacción que se deshace al final
(el DDL de Postgres es transaccional). `db/schema.sql` se monta en el contenedor en
`/var/www/db` (ver `docker/compose.yml`).
