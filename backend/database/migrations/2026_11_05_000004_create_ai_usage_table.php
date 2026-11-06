<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Tabla `ai_usage`: las mismas sentencias idempotentes que db/schema.sql, en el mismo
 * orden (SchemaParityTest y AdoptionTest lo comprueban).
 *
 * En una base vacía crea la tabla; en una existente (Neon) añade solo lo que falte
 * (`cost_micros` en bases anteriores a la cuota por coste, índices), igual que volver
 * a pasar schema.sql: nunca borra ni cambia columnas ni filas. SQL literal: ver la de `users`.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            create table if not exists ai_usage (
              id                bigserial primary key,
              created_at        timestamptz not null default now(),
              day               date        not null default current_date,
              user_id           uuid        references users(id) on delete set null,
              device_id         text,
              ip_hash           text        not null,
              kind              text        not null,
              model             text        not null,
              prompt_tokens     integer     not null default 0,
              completion_tokens integer     not null default 0,
              cost_micros       integer     not null default 0,
              ok                boolean     not null default true
            )
            SQL);
        DB::statement('alter table ai_usage add column if not exists cost_micros integer not null default 0');
        DB::statement('create index if not exists ai_usage_day_idx on ai_usage (day)');
        DB::statement('create index if not exists ai_usage_user_day_idx on ai_usage (user_id, day)');
        DB::statement('create index if not exists ai_usage_user_idx on ai_usage (user_id, created_at desc)');
        DB::statement('create index if not exists ai_usage_device_idx on ai_usage (device_id) where device_id is not null');
        DB::statement('create index if not exists ai_usage_ip_idx on ai_usage (ip_hash, created_at desc)');
    }

    public function down(): void
    {
        // Vacío a propósito: nunca se borra una tabla que puede tener datos de producción.
    }
};
