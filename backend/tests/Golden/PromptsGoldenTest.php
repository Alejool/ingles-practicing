<?php

namespace Tests\Golden;

use PHPUnit\Framework\TestCase;
use Ruta\Ai\Domain\AiKind;
use Ruta\Ai\Domain\PayloadError;
use Ruta\Ai\Domain\PromptBuilder;

/**
 * `PromptBuilder::build` igual a `buildMessages` de shared/prompts.ts, y `AiKind::isKind`
 * igual a `isKind`, en cada caso de tests/fixtures/prompts.json (generado por
 * scripts/exportar-prompts.mts; su frescura la vigila tests/fixtures-frescas.test.mts).
 */
final class PromptsGoldenTest extends TestCase
{
    private static function fixture(): \stdClass
    {
        return json_decode((string) file_get_contents(__DIR__.'/../fixtures/prompts.json'), false, flags: JSON_THROW_ON_ERROR);
    }

    public function test_kinds_and_is_kind(): void
    {
        $f = self::fixture();
        $this->assertSame($f->kinds, AiKind::ALL);
        foreach ($f->isKind as $case) {
            $this->assertSame($case->isKind, AiKind::isKind($case->value), json_encode($case->value));
        }
    }

    public function test_messages_match_the_typescript_output(): void
    {
        $cases = self::fixture()->cases;
        $this->assertGreaterThan(30, count($cases));

        foreach ($cases as $i => $case) {
            $label = "caso $i ({$case->kind})";
            try {
                $messages = PromptBuilder::build($case->kind, $case->payload);
                $this->assertFalse(isset($case->error), "$label: debía fallar con «".($case->error ?? '')."»");
                $this->assertSame(
                    json_encode($case->messages, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    json_encode($messages, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    $label);
            } catch (PayloadError $e) {
                $this->assertSame($case->error ?? '(no debía fallar)', $e->getMessage(), $label);
            }
        }
    }
}
