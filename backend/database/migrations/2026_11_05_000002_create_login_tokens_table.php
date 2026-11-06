<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Tabla `login_tokens`: las mismas sentencias idempotentes que db/schema.sql, en el mismo
 * orden (SchemaParityTest y AdoptionTest lo comprueban).
 *
 * En una base vacía crea la tabla; en una existente (Neon) añade solo lo que falte
 * (`return_to` en bases anteriores a esa columna, índices), igual que volver a pasar
 * schema.sql: nunca borra ni cambia columnas ni filas. SQL literal: ver la de `users`.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            create table if not exists login_tokens (
              id          bigserial primary key,
              email       text        not null,
              token_hash  text        not null unique,
              expires_at  timestamptz not null,
              used_at     timestamptz,
              ip_hash     text,
              created_at  timestamptz not null default now()
            )
            SQL);
        DB::statement('alter table login_tokens add column if not exists return_to text');
        DB::statement('create index if not exists login_tokens_email_idx on login_tokens (email, created_at desc)');
        DB::statement('create index if not exists login_tokens_expires_idx on login_tokens (expires_at)');
    }

    public function down(): void
    {
        // Vacío a propósito: nunca se borra una tabla que puede tener datos de producción.
    }
};
