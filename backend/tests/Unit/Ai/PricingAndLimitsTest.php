<?php

namespace Tests\Unit\Ai;

use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;
use Ruta\Ai\Domain\Pricing;
use Ruta\Ai\Domain\QuotaLimits;
use Ruta\Shared\Domain\JsNumber;

/** Precios (`costeMicros`) y lectura de límites (`limits()`, `num()`, `precioNum`) de _quota.mts. */
final class PricingAndLimitsTest extends TestCase
{
    private const PRICES = [
        'deepseek-chat' => ['in' => 0.27, 'out' => 1.10],
        'deepseek-reasoner' => ['in' => 0.55, 'out' => 2.19],
    ];

    public function test_cost_in_micros(): void
    {
        $p = new Pricing(self::PRICES);
        // 1000 × 0.27 + 500 × 1.10 = 270 + 550 micros.
        $this->assertSame(820, $p->costMicros('deepseek-chat', 1000, 500));
        $this->assertSame(1645, $p->costMicros('deepseek-reasoner', 1000, 500));
        $this->assertSame(0, $p->costMicros('deepseek-chat', 0, 0));
        // Math.round: 0.27 × 3 = 0.81 → 1; 0.27 × 1 = 0.27 → 0.
        $this->assertSame(1, $p->costMicros('deepseek-chat', 3, 0));
        $this->assertSame(0, $p->costMicros('deepseek-chat', 1, 0));
    }

    public function test_unknown_model_is_charged_at_the_most_expensive_price(): void
    {
        $p = new Pricing(self::PRICES);
        $this->assertSame($p->costMicros('deepseek-reasoner', 1234, 5678), $p->costMicros('otro', 1234, 5678));
    }

    public function test_on_a_tie_the_first_model_wins(): void
    {
        $p = new Pricing(['a' => ['in' => 1.0, 'out' => 2.0], 'b' => ['in' => 9.0, 'out' => 2.0]]);
        $this->assertSame(3, $p->costMicros('zzz', 1, 1));
    }

    /** @return array<string, array{mixed, int}> */
    public static function ints(): array
    {
        return [
            'unset' => [null, 7], 'empty' => ['', 7], 'number' => ['15', 15], 'prefix' => ['15abc', 15],
            'spaces' => ['  9', 9], 'negative' => ['-3', -3], 'text' => ['abc', 7], 'decimal' => ['2.9', 2],
        ];
    }

    #[DataProvider('ints')]
    public function test_parse_int_like_num(mixed $raw, int $expected): void
    {
        $this->assertSame($expected, JsNumber::parseInt($raw, 7));
    }

    public function test_number_like_js_number(): void
    {
        $this->assertNull(JsNumber::number(null));
        $this->assertSame(0.0, JsNumber::number(''));
        $this->assertSame(0.5, JsNumber::number(' 0.5 '));
        $this->assertSame(1000.0, JsNumber::number('1e3'));
        $this->assertNull(JsNumber::number('3 dólares'));
    }

    public function test_limits_defaults_match_node(): void
    {
        // config/ruta.php sin ninguna QUOTA_* definida (el entorno de los tests no las define).
        $l = QuotaLimits::fromConfig((require __DIR__.'/../../../config/ruta.php')['quota'], true);
        $this->assertSame(15, $l->anonLifetime);
        $this->assertSame('total', $l->anonWindow);
        $this->assertSame(20, $l->anonDaily);
        $this->assertSame(30, $l->anonIpWindowDays);
        $this->assertSame(60, $l->userDaily);
        $this->assertSame(900, $l->userMonthly);
        $this->assertSame(6000, $l->globalDaily);
        $this->assertSame(6, $l->perMinute);
        $this->assertSame(2048, $l->maxTokens);
        $this->assertSame(500, $l->creditMicros);
        $this->assertSame(3.0, $l->globalDailyUsd);
        $this->assertTrue($l->accountsEnabled);
    }
}
