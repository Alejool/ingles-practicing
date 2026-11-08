<?php

namespace Ruta\Admin\Application;

use Ruta\Admin\Infrastructure\AdminQueries;
use Ruta\Shared\Domain\DomainError;

/**
 * `op=schema`: aplica db/schema.sql (idempotente) como `migrate()` de _db.mts: quita
 * los comentarios `--`, parte por `;` y ejecuta cada sentencia no vacía. No crea las
 * tablas del harness (esas solo por migración).
 */
final class ApplyBaselineSchema
{
    public function __construct(
        private readonly AdminQueries $queries,
        private readonly string $schemaPath,
    ) {}

    /** @return int sentencias ejecutadas */
    public function handle(): int
    {
        $sql = is_file($this->schemaPath) ? file_get_contents($this->schemaPath) : false;
        if ($sql === false) {
            throw new DomainError('schema_missing', 'No se encontró db/schema.sql en el despliegue.');
        }

        $statements = self::statements($sql);
        foreach ($statements as $statement) {
            $this->queries->statement($statement);
        }

        return count($statements);
    }

    /** @return list<string> */
    public static function statements(string $sql): array
    {
        $withoutComments = implode("\n", array_map(
            fn (string $line) => (string) preg_replace('/--.*$/', '', $line),
            explode("\n", $sql),
        ));

        return array_values(array_filter(
            array_map('trim', explode(';', $withoutComments)),
            fn (string $s) => $s !== '',
        ));
    }
}
