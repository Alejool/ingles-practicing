<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Tabla `pulse`: las mismas sentencias idempotentes que db/schema.sql, en el mismo orden
 * (SchemaParityTest y AdoptionTest lo comprueban).
 *
 * En una base vacía crea la tabla; en una existente (Neon) añade solo el índice si
 * falta, igual que volver a pasar schema.sql: nunca borra ni cambia columnas ni filas.
 * SQL literal: ver la de `users`.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            create table if not exists pulse (
              anon       text        not null,
              day        date        not null default current_date,
              track      text        not null,
              plan_day   integer     not null default 1,
              done_days  integer     not null default 0,
              streak     integer     not null default 0,
              seen       text        not null default '',
              updated_at timestamptz not null default now(),
              primary key (anon, day)
            )
            SQL);
        DB::statement('create index if not exists pulse_day_idx on pulse (day)');
    }

    public function down(): void
    {
        // Vacío a propósito: nunca se borra una tabla que puede tener datos de producción.
    }
};
