<?php

namespace Tests\Feature\Database;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Las migraciones crean exactamente lo mismo que `db/schema.sql`.
 *
 * Base A: `schema.sql` en un esquema vacío. Base B: `php artisan migrate` en otro.
 * Se comparan columnas (tipo, nulo, defecto), restricciones, índices y secuencias.
 * Las dos viven dentro de una transacción que se deshace: no queda nada en `ruta_test`.
 */
final class SchemaParityTest extends TestCase
{
    public function test_migrations_build_the_same_schema_as_schema_sql(): void
    {
        $db = DB::connection();
        $sandbox = new SchemaSandbox($db);

        $db->beginTransaction();
        try {
            $a = $sandbox->enterNewSchema('parity_a');
            $sandbox->applySchemaSql();
            $fromSql = $sandbox->describe($a);

            $b = $sandbox->enterNewSchema('parity_b');
            $this->assertSame(0, Artisan::call('migrate', ['--force' => true]), Artisan::output());
            $fromMigrations = $sandbox->describe($b);
        } finally {
            $db->rollBack();
        }

        $this->assertCount(count(SchemaSandbox::TABLES), $fromSql['tables'], 'schema.sql debería crear siete tablas');
        foreach (array_keys($fromSql) as $part) {
            $this->assertSame($fromSql[$part], $fromMigrations[$part], "Difiere: $part");
        }
    }

    public function test_the_sandbox_leaves_nothing_behind(): void
    {
        $left = DB::scalar("select count(*) from pg_namespace where nspname like 'parity\\_%' or nspname like 'adopt\\_%'");

        $this->assertSame(0, (int) $left);
    }
}
