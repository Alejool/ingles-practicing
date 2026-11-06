<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Tabla `shared_readings`: las mismas sentencias idempotentes que db/schema.sql, en el
 * mismo orden (SchemaParityTest y AdoptionTest lo comprueban).
 *
 * En una base vacía crea la tabla; en una existente (Neon) añade solo los índices que
 * falten, igual que volver a pasar schema.sql: nunca borra ni cambia columnas ni filas.
 * SQL literal: ver la de `users` (además, el índice `lower(topic)` es de expresión).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            create table if not exists shared_readings (
              id         text        primary key,
              created_at timestamptz not null default now(),
              track      text        not null,
              level      text        not null,
              topic      text        not null default '',
              title      text        not null,
              words      integer     not null default 0,
              data       jsonb       not null,
              author_id  uuid        references users(id) on delete set null,
              reads      integer     not null default 0,
              hidden     boolean     not null default false
            )
            SQL);
        DB::statement('create index if not exists shared_readings_track_idx on shared_readings (track, hidden, created_at desc)');
        DB::statement('create index if not exists shared_readings_topic_idx on shared_readings (track, lower(topic))');
    }

    public function down(): void
    {
        // Vacío a propósito: nunca se borra una tabla que puede tener datos de producción.
    }
};
