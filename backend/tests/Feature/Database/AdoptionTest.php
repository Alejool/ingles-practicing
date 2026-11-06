<?php

namespace Tests\Feature\Database;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Adopción de una base existente (como Neon): creada con `schema.sql`, actual o de
 * una versión anterior, y con datos. `php artisan migrate` hace lo mismo que volver a
 * pasar `schema.sql`: añade lo que falte (columnas, índices) y no toca ninguna fila.
 *
 * Todo dentro de una transacción que se deshace: no queda nada en `ruta_test`.
 */
final class AdoptionTest extends TestCase
{
    private const USER = '00000000-0000-4000-8000-000000000001';

    public function test_migrate_adopts_an_existing_database_without_changing_it(): void
    {
        $db = DB::connection();
        $sandbox = new SchemaSandbox($db);

        $db->beginTransaction();
        try {
            $schema = $sandbox->enterNewSchema('adopt');
            $sandbox->applySchemaSql();
            $this->seedEveryTable(legacy: false);

            $schemaBefore = $sandbox->describe($schema);
            $rowsBefore = $sandbox->contents();

            $this->migrate();

            $schemaAfter = $sandbox->describe($schema);
            $rowsAfter = $sandbox->contents();
            $ran = $db->table('migrations')->orderBy('migration')->pluck('migration')->all();
            $batches = $db->table('migrations')->distinct()->pluck('batch')->all();
        } finally {
            $db->rollBack();
        }

        $this->assertSame(self::migrationNames(), $ran);
        $this->assertCount(count(SchemaSandbox::TABLES), $ran);
        $this->assertSame([1], $batches);
        $this->assertSame($schemaBefore, $schemaAfter);
        $this->assertSame($rowsBefore, $rowsAfter);
        foreach ($rowsBefore as $table => $info) {
            $this->assertGreaterThan(0, $info['count'], "Sin filas de prueba en $table");
        }
    }

    /**
     * Base anterior a `return_to`, `cost_micros` y `ai_usage_ip_idx`: migrate la deja
     * igual que `schema.sql` sobre la misma base antigua, y las filas no cambian.
     */
    public function test_migrate_heals_a_legacy_database_like_schema_sql_does(): void
    {
        $db = DB::connection();
        $sandbox = new SchemaSandbox($db);

        $db->beginTransaction();
        try {
            $healedBySql = $sandbox->enterNewSchema('adopt_sql');
            $sandbox->applyLegacySchemaSql();
            $sandbox->applySchemaSql();
            $expected = $sandbox->describe($healedBySql);

            $legacy = $sandbox->enterNewSchema('adopt_legacy');
            $sandbox->applyLegacySchemaSql();
            $this->seedEveryTable(legacy: true);
            $originalColumns = $this->columnsByTable($legacy);
            $rowsBefore = $this->contentsOfColumns($sandbox, $originalColumns);

            $this->migrate();

            $actual = $sandbox->describe($legacy);
            $rowsAfter = $this->contentsOfColumns($sandbox, $originalColumns);
            $healedColumns = $this->columnsByTable($legacy);
        } finally {
            $db->rollBack();
        }

        $this->assertNotContains('return_to', $originalColumns['login_tokens']);
        $this->assertNotContains('cost_micros', $originalColumns['ai_usage']);
        $this->assertContains('return_to', $healedColumns['login_tokens']);
        $this->assertContains('cost_micros', $healedColumns['ai_usage']);
        $this->assertContains('ai_usage_ip_idx', array_column($actual['indexes'], 'indexname'));
        foreach (array_keys($expected) as $part) {
            $this->assertSame($expected[$part], $actual[$part], "Difiere: $part");
        }
        $this->assertSame($rowsBefore, $rowsAfter);
    }

    /** @return list<string> nombres de las migraciones del proyecto, ordenados */
    private static function migrationNames(): array
    {
        $files = glob(database_path('migrations/*.php')) ?: [];
        sort($files);

        return array_map(fn ($f) => basename($f, '.php'), $files);
    }

    private function migrate(): void
    {
        $this->assertSame(0, Artisan::call('migrate', ['--force' => true]), Artisan::output());
    }

    /** @return array<string, list<string>> */
    private function columnsByTable(string $schema): array
    {
        $out = [];
        foreach (SchemaSandbox::TABLES as $table) {
            $out[$table] = DB::table('information_schema.columns')
                ->where('table_schema', $schema)->where('table_name', $table)
                ->orderBy('ordinal_position')->pluck('column_name')->all();
        }

        return $out;
    }

    /**
     * @param  array<string, list<string>>  $columns
     * @return array<string, array{count: int, checksum: string}>
     */
    private function contentsOfColumns(SchemaSandbox $sandbox, array $columns): array
    {
        $out = [];
        foreach ($columns as $table => $cols) {
            $out[$table] = $sandbox->contentsOf($table, $cols);
            $this->assertGreaterThan(0, $out[$table]['count'], "Sin filas de prueba en $table");
        }

        return $out;
    }

    private function seedEveryTable(bool $legacy): void
    {
        DB::insert("insert into users (id, email, daily_bonus) values (?, 'adopt@example.test', 3)", [self::USER]);

        if ($legacy) {
            DB::insert("insert into login_tokens (email, token_hash, expires_at)
                        values ('adopt@example.test', 'hash-login', now() + interval '15 minutes')");
            DB::insert("insert into ai_usage (user_id, device_id, ip_hash, kind, model, prompt_tokens, completion_tokens)
                        values (?, 'device-1', 'ip-hash', 'cloze', 'deepseek-chat', 120, 40)", [self::USER]);
        } else {
            DB::insert("insert into login_tokens (email, token_hash, expires_at, return_to)
                        values ('adopt@example.test', 'hash-login', now() + interval '15 minutes', 'http://localhost:4321/')");
            DB::insert("insert into ai_usage (user_id, device_id, ip_hash, kind, model, prompt_tokens, completion_tokens, cost_micros)
                        values (?, 'device-1', 'ip-hash', 'cloze', 'deepseek-chat', 120, 40, 77)", [self::USER]);
        }

        DB::insert("insert into sessions (user_id, token_hash, expires_at, user_agent)
                    values (?, 'hash-session', now() + interval '30 days', 'phpunit')", [self::USER]);
        DB::insert("insert into progress (user_id, data, version) values (?, '{\"cards\":{},\"days\":[1,2]}'::jsonb, 4)", [self::USER]);
        DB::insert("insert into shared_readings (id, track, level, topic, title, words, data, author_id)
                    values ('r-adopt', 'b2', 'B2', 'Travel', 'Adopted', 120, '{\"title\":\"Adopted\",\"body\":\"x\",\"qs\":[]}'::jsonb, ?)", [self::USER]);
        DB::insert("insert into pulse (anon, track, plan_day, done_days, streak, seen)
                    values ('anon-1', 'b2', 12, 10, 3, 'cards,reading')");
    }
}
