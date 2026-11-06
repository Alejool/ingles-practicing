<?php

namespace Tests\Feature\Database;

use Illuminate\Database\ConnectionInterface;
use PHPUnit\Framework\Assert;

/**
 * Esquemas de Postgres desechables para comparar `db/schema.sql` con las migraciones.
 *
 * Todo ocurre dentro de una transacción que se deshace al final (el DDL de Postgres
 * es transaccional): se crea un esquema con nombre único, se apunta `search_path`
 * a él con `set local`, se construye y se inspecciona. Al hacer ROLLBACK no queda
 * nada: ni el esquema, ni sus tablas, ni sus filas. Nunca se borra ni se vacía nada.
 */
final class SchemaSandbox
{
    /** Las siete tablas de `schema.sql`; la tabla `migrations` de Laravel no cuenta. */
    public const TABLES = ['users', 'login_tokens', 'sessions', 'ai_usage', 'progress', 'shared_readings', 'pulse'];

    public function __construct(private readonly ConnectionInterface $db) {}

    public static function schemaSqlPath(): string
    {
        // En el contenedor, backend/ está en /var/www/html y db/ se monta en /var/www/db.
        return base_path('../db/schema.sql');
    }

    /** Crea un esquema vacío con nombre único y lo deja como `search_path` de la transacción. */
    public function enterNewSchema(string $prefix): string
    {
        Assert::assertGreaterThan(0, $this->db->transactionLevel(), 'Los esquemas de prueba solo se crean dentro de una transacción.');

        $name = $prefix.'_'.bin2hex(random_bytes(6));
        $this->db->statement('create schema "'.$name.'"');
        $this->use($name);

        return $name;
    }

    public function use(string $schema): void
    {
        $this->db->statement('set local search_path to "'.$schema.'"');
    }

    public function applySchemaSql(): void
    {
        $this->db->unprepared($this->schemaSql());
    }

    /**
     * Una base anterior a `return_to`, `cost_micros` y el índice `ai_usage_ip_idx`:
     * `schema.sql` sin esas líneas. Cada línea quitada tiene que existir, así que si
     * `schema.sql` cambia, el test lo dice en vez de construir otra cosa.
     */
    public function applyLegacySchemaSql(): void
    {
        $sql = $this->schemaSql();
        $lines = [
            '/^alter table login_tokens add column if not exists return_to text;\r?\n/m',
            '/^alter table ai_usage add column if not exists cost_micros integer not null default 0;\r?\n/m',
            '/^  cost_micros       integer     not null default 0,\r?\n/m',
            '/^create index if not exists ai_usage_ip_idx .*\n/m',
        ];
        foreach ($lines as $pattern) {
            $sql = preg_replace($pattern, '', $sql, -1, $count);
            Assert::assertSame(1, $count, "schema.sql ya no tiene la línea $pattern");
        }
        $this->db->unprepared($sql);
    }

    private function schemaSql(): string
    {
        $path = self::schemaSqlPath();
        Assert::assertFileExists($path, 'db/schema.sql no está montado en el contenedor (ver docker/compose.yml).');

        return (string) file_get_contents($path);
    }

    /**
     * Recuento y suma de comprobación de unas columnas concretas de una tabla.
     *
     * @param  list<string>  $columns
     * @return array{count: int, checksum: string}
     */
    public function contentsOf(string $table, array $columns): array
    {
        $cols = implode(', ', array_map(fn ($c) => '"'.$c.'"', $columns));
        $row = $this->db->selectOne(
            "select count(*)::int as n, coalesce(md5(string_agg(r::text, E'\\n' order by r::text)), '') as sum
             from (select $cols from \"$table\") r"
        );

        return ['count' => (int) $row->n, 'checksum' => (string) $row->sum];
    }

    /**
     * Columnas, restricciones, índices y secuencias de las siete tablas, con el nombre
     * del esquema sustituido por `<s>` para que dos esquemas iguales den lo mismo.
     *
     * @return array<string, list<array<string, mixed>>>
     */
    public function describe(string $schema): array
    {
        $tables = self::TABLES;
        $in = implode(',', array_fill(0, count($tables), '?'));

        $snapshot = [
            'tables' => $this->rows(
                "select table_name, table_type from information_schema.tables
                 where table_schema = ? and table_name <> 'migrations' order by table_name",
                [$schema],
            ),
            'columns' => $this->rows(
                "select table_name, column_name, ordinal_position, data_type, udt_name,
                        character_maximum_length, numeric_precision, numeric_scale, datetime_precision,
                        is_nullable, column_default, is_identity
                 from information_schema.columns
                 where table_schema = ? and table_name in ($in)
                 order by table_name, ordinal_position",
                [$schema, ...$tables],
            ),
            'constraints' => $this->rows(
                "select c.relname as table_name, k.conname, k.contype, pg_get_constraintdef(k.oid) as definition
                 from pg_constraint k
                 join pg_class c on c.oid = k.conrelid
                 join pg_namespace n on n.oid = c.relnamespace
                 where n.nspname = ? and c.relname in ($in)
                 order by c.relname, k.conname",
                [$schema, ...$tables],
            ),
            'indexes' => $this->rows(
                "select tablename, indexname, indexdef from pg_indexes
                 where schemaname = ? and tablename in ($in)
                 order by tablename, indexname",
                [$schema, ...$tables],
            ),
            'sequences' => $this->rows(
                "select sequence_name, data_type, start_value, minimum_value, maximum_value, increment, cycle_option
                 from information_schema.sequences
                 where sequence_schema = ? and sequence_name <> 'migrations_id_seq' order by sequence_name",
                [$schema],
            ),
        ];

        return $this->anonymise($snapshot, $schema);
    }

    /**
     * Recuento y suma de comprobación del contenido de cada tabla (fila entera como texto).
     *
     * @return array<string, array{count: int, checksum: string}>
     */
    public function contents(): array
    {
        $out = [];
        foreach (self::TABLES as $table) {
            $row = $this->db->selectOne(
                "select count(*)::int as n, coalesce(md5(string_agg(t::text, E'\\n' order by t::text)), '') as sum from \"$table\" t"
            );
            $out[$table] = ['count' => (int) $row->n, 'checksum' => (string) $row->sum];
        }

        return $out;
    }

    /** @return list<array<string, mixed>> */
    private function rows(string $sql, array $bindings): array
    {
        return array_map(fn ($r) => (array) $r, $this->db->select($sql, $bindings));
    }

    /**
     * @param  array<string, list<array<string, mixed>>>  $snapshot
     * @return array<string, list<array<string, mixed>>>
     */
    private function anonymise(array $snapshot, string $schema): array
    {
        array_walk_recursive($snapshot, function (&$value) use ($schema) {
            if (is_string($value)) {
                $value = str_replace(['"'.$schema.'".', $schema.'.'], '<s>.', $value);
            }
        });

        return $snapshot;
    }
}
