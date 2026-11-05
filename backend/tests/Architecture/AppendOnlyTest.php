<?php

namespace Tests\Architecture;

use PHPUnit\Framework\TestCase;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * Las tablas declaradas solo-inserción no se actualizan ni se borran desde el código:
 * ni con SQL (`update t`, `delete from t`) ni con el constructor (`table('t')->update()`).
 * La lista empieza vacía; la llenan las tablas del harness (eventos del alumno).
 */
final class AppendOnlyTest extends TestCase
{
    /** @var list<string> */
    private const APPEND_ONLY_TABLES = [];

    public function test_append_only_tables_are_never_updated_or_deleted(): void
    {
        $root = dirname(__DIR__, 2);
        $violations = [];
        foreach ([...self::phpFiles($root.'/src'), ...self::phpFiles($root.'/app')] as $file) {
            foreach (self::violations((string) file_get_contents($file), self::APPEND_ONLY_TABLES) as $v) {
                $violations[] = "$file: $v";
            }
        }

        $this->assertSame([], $violations);
    }

    public function test_detector_catches_updates_and_deletes(): void
    {
        $code = (string) file_get_contents(dirname(__DIR__).'/fixtures/architecture/AppendOnlyViolation.php');

        $this->assertSame(
            ['update learner_events', 'delete from learner_events', "table('learner_events')->update", "table('learner_events')->delete"],
            self::violations($code, ['learner_events']),
        );
    }

    public function test_detector_allows_inserts_and_other_tables(): void
    {
        $code = <<<'PHP'
            <?php
            $db->insert('insert into learner_events (id) values (?)', [1]);
            $db->update('update progress set version = version + 1');
            $db->table('learner_events')->insert(['id' => 1]);
            $db->select('select * from learner_events_archive');
            PHP;

        $this->assertSame([], self::violations($code, ['learner_events']));
    }

    /** @return list<string> */
    private static function phpFiles(string $dir): array
    {
        if (! is_dir($dir)) {
            return [];
        }
        $files = [];
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS));
        foreach ($it as $f) {
            if ($f->isFile() && $f->getExtension() === 'php') {
                $files[] = $f->getPathname();
            }
        }
        sort($files);

        return $files;
    }

    /**
     * @param  list<string>  $tables
     * @return list<string>
     */
    private static function violations(string $code, array $tables): array
    {
        $found = [];
        foreach ($tables as $table) {
            $t = preg_quote($table, '/');
            $patterns = [
                "/\\bupdate\\s+(?:only\\s+)?\"?{$t}\"?(?![\\w])/i" => "update $table",
                "/\\bdelete\\s+from\\s+(?:only\\s+)?\"?{$t}\"?(?![\\w])/i" => "delete from $table",
                "/table\\(\\s*['\"]{$t}['\"]\\s*\\)(?:(?!;).)*?->\\s*update\\s*\\(/s" => "table('$table')->update",
                "/table\\(\\s*['\"]{$t}['\"]\\s*\\)(?:(?!;).)*?->\\s*delete\\s*\\(/s" => "table('$table')->delete",
            ];
            foreach ($patterns as $regex => $label) {
                if (preg_match($regex, $code)) {
                    $found[] = $label;
                }
            }
        }

        return $found;
    }
}
