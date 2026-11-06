<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Tabla `sessions`: las mismas sentencias idempotentes que db/schema.sql, en el mismo
 * orden (SchemaParityTest y AdoptionTest lo comprueban).
 *
 * En una base vacía crea la tabla; en una existente (Neon) añade solo lo que falte,
 * igual que volver a pasar schema.sql: nunca borra ni cambia columnas ni filas.
 * SQL literal: ver la de `users`.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            create table if not exists sessions (
              id            bigserial primary key,
              user_id       uuid        not null references users(id) on delete cascade,
              token_hash    text        not null unique,
              created_at    timestamptz not null default now(),
              last_used_at  timestamptz not null default now(),
              expires_at    timestamptz not null,
              user_agent    text
            )
            SQL);
        DB::statement('create index if not exists sessions_user_idx on sessions (user_id)');
        DB::statement('create index if not exists sessions_expires_idx on sessions (expires_at)');
    }

    public function down(): void
    {
        // Vacío a propósito: nunca se borra una tabla que puede tener datos de producción.
    }
};
