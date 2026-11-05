<?php

namespace Tests\Architecture;

use PHPUnit\Framework\TestCase;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * `src/<Contexto>/Domain/**` es PHP puro: ni Laravel, ni la capa `App\`, ni fachadas,
 * ni los helpers globales del framework.
 */
final class DomainIsFrameworkFreeTest extends TestCase
{
    private const FORBIDDEN_NAMESPACES = ['Illuminate\\', 'Laravel\\', 'App\\'];

    private const FACADES = [
        'App', 'Artisan', 'Auth', 'Cache', 'Config', 'Cookie', 'Crypt', 'DB', 'Event', 'File', 'Hash',
        'Http', 'Log', 'Mail', 'Queue', 'Redis', 'Request', 'Response', 'Route', 'Schema', 'Session',
        'Storage', 'URL', 'Validator', 'View',
    ];

    private const HELPERS = [
        'app', 'auth', 'cache', 'config', 'cookie', 'dispatch', 'env', 'event', 'logger', 'now',
        'request', 'response', 'session', 'today', 'view',
    ];

    public function test_domain_code_has_no_framework_dependencies(): void
    {
        $violations = [];
        foreach (self::domainFiles(dirname(__DIR__, 2).'/src') as $file) {
            foreach (self::violations((string) file_get_contents($file)) as $v) {
                $violations[] = "$file: $v";
            }
        }

        $this->assertSame([], $violations);
    }

    public function test_detector_catches_a_violating_file(): void
    {
        $code = (string) file_get_contents(dirname(__DIR__).'/fixtures/architecture/DomainViolation.php');

        $this->assertSame(
            ['Illuminate\\Support\\Facades\\DB', 'App\\Http\\Support\\ApiJson', 'DB::', 'Log::', 'config()', 'now()'],
            self::violations($code),
        );
    }

    public function test_detector_ignores_comments_strings_and_methods(): void
    {
        $code = (string) file_get_contents(dirname(__DIR__).'/fixtures/architecture/DomainClean.php');

        $this->assertSame([], self::violations($code));
    }

    /** @return list<string> */
    private static function domainFiles(string $src): array
    {
        $files = [];
        foreach (glob($src.'/*/Domain', GLOB_ONLYDIR) ?: [] as $dir) {
            $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS));
            foreach ($it as $f) {
                if ($f->isFile() && $f->getExtension() === 'php') {
                    $files[] = $f->getPathname();
                }
            }
        }
        sort($files);

        return $files;
    }

    /**
     * Lo que el código usa del framework, en orden de aparición. Trabaja sobre tokens,
     * así que los comentarios y las cadenas no cuentan.
     *
     * @return list<string>
     */
    private static function violations(string $code): array
    {
        $tokens = array_values(array_filter(
            token_get_all($code),
            fn ($t) => ! is_array($t) || ! in_array($t[0], [T_WHITESPACE, T_COMMENT, T_DOC_COMMENT], true),
        ));

        $found = [];
        foreach ($tokens as $i => $t) {
            if (! is_array($t)) {
                continue;
            }
            $prev = $tokens[$i - 1] ?? null;
            $next = $tokens[$i + 1] ?? null;
            $afterMember = is_array($prev) && in_array($prev[0], [T_OBJECT_OPERATOR, T_NULLSAFE_OBJECT_OPERATOR, T_DOUBLE_COLON, T_FUNCTION, T_NEW], true);

            if (in_array($t[0], [T_NAME_QUALIFIED, T_NAME_FULLY_QUALIFIED], true)) {
                $name = ltrim($t[1], '\\');
                foreach (self::FORBIDDEN_NAMESPACES as $ns) {
                    if (str_starts_with($name, $ns)) {
                        $found[] = $name;
                    }
                }
            } elseif ($t[0] === T_STRING && is_array($next) && $next[0] === T_DOUBLE_COLON && in_array($t[1], self::FACADES, true)) {
                $found[] = $t[1].'::';
            } elseif ($t[0] === T_STRING && $next === '(' && ! $afterMember && in_array(strtolower($t[1]), self::HELPERS, true)) {
                $found[] = strtolower($t[1]).'()';
            }
        }

        return $found;
    }
}
