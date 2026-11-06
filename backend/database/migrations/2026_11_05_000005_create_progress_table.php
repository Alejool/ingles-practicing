<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Tabla `progress`: la misma sentencia idempotente que db/schema.sql
 * (SchemaParityTest y AdoptionTest lo comprueban).
 *
 * En una base vacía crea la tabla; en una existente (Neon) no hace nada, igual que
 * volver a pasar schema.sql. SQL literal: ver la de `users`.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            create table if not exists progress (
              user_id    uuid        primary key references users(id) on delete cascade,
              data       jsonb       not null,
              version    integer     not null default 1,
              updated_at timestamptz not null default now()
            )
            SQL);
    }

    public function down(): void
    {
        // Vacío a propósito: nunca se borra una tabla que puede tener datos de producción.
    }
};
