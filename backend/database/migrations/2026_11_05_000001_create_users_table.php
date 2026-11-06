<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Tabla `users`: las mismas sentencias idempotentes que db/schema.sql, en el mismo orden
 * (SchemaParityTest y AdoptionTest lo comprueban).
 *
 * En una base vacía crea la tabla; en una existente (Neon) añade solo lo que falte,
 * igual que volver a pasar schema.sql: nunca borra ni cambia columnas ni filas.
 * SQL literal porque el constructor de Laravel no da los mismos defectos (now(),
 * precisión de timestamptz) ni los mismos nombres de restricción que Postgres.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            create table if not exists users (
              id            uuid primary key default gen_random_uuid(),
              email         text        not null unique,
              created_at    timestamptz not null default now(),
              last_seen_at  timestamptz,
              blocked       boolean     not null default false,
              daily_bonus   integer     not null default 0
            )
            SQL);
    }

    public function down(): void
    {
        // Vacío a propósito: nunca se borra una tabla que puede tener datos de producción.
    }
};
