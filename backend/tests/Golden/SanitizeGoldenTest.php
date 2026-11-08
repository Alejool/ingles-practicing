<?php

namespace Tests\Golden;

use PHPUnit\Framework\TestCase;
use Ruta\Shared\Domain\HtmlSanitizer;

/**
 * `HtmlSanitizer::clean` igual a `htmlSeguro` de shared/sanitize.ts en cada entrada de
 * tests/fixtures/sanitize.json (generado por scripts/exportar-prompts.mts; su frescura
 * la vigila tests/fixtures-frescas.test.mts en la raíz).
 */
final class SanitizeGoldenTest extends TestCase
{
    public function test_matches_the_typescript_output(): void
    {
        /** @var list<\stdClass> $cases */
        $cases = json_decode((string) file_get_contents(__DIR__.'/../fixtures/sanitize.json'), false, flags: JSON_THROW_ON_ERROR);
        $this->assertGreaterThan(20, count($cases));

        foreach ($cases as $case) {
            $this->assertSame($case->output, HtmlSanitizer::clean($case->input), json_encode($case->input, JSON_UNESCAPED_UNICODE));
        }
    }

    public function test_cleaning_twice_is_the_same_as_once(): void
    {
        $once = HtmlSanitizer::clean('<script>x</script> <b>ok</b> & "y"');
        $this->assertSame($once, HtmlSanitizer::clean($once));
    }
}
