<?php

namespace Tests\Unit\Ai;

use DateTimeImmutable;
use DateTimeZone;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Ruta\Ai\Domain\QuotaLimits;
use Ruta\Ai\Domain\QuotaPolicy;
use Ruta\Ai\Domain\QuotaUsage;
use Ruta\Auth\Domain\SessionUser;
use Ruta\Shared\Domain\DomainError;

/** La decisión de `comprobar()` y `medir()` de _quota.mts, sin base: las sumas llegan medidas. */
final class QuotaPolicyTest extends TestCase
{
    private const NOW = '2026-11-06T15:30:00.000Z';

    /** @param array<string, mixed> $overrides */
    private function policy(array $overrides = [], bool $accounts = true): QuotaPolicy
    {
        return new QuotaPolicy(QuotaLimits::fromConfig([
            'anon_lifetime' => 15, 'anon_window' => 'total', 'anon_daily' => 20, 'anon_ip_window_days' => 30,
            'user_daily' => 60, 'user_monthly' => 900, 'global_daily' => 6000, 'per_minute' => 6,
            'max_tokens' => 2048, 'credit_micros' => 500, 'global_daily_usd' => 3.0, ...$overrides,
        ], $accounts));
    }

    private function now(): DateTimeImmutable
    {
        return new DateTimeImmutable(self::NOW, new DateTimeZone('UTC'));
    }

    private function user(int $bonus = 0): SessionUser
    {
        return new SessionUser('u-1', 'ana@example.com', $bonus, false);
    }

    /** Micros que valen `n` créditos de 500. */
    private static function credits(int $n): int
    {
        return $n * 500;
    }

    private function assertRejects(string $code, string $message, callable $fn): DomainError
    {
        try {
            $fn();
        } catch (DomainError $e) {
            $this->assertSame($code, $e->errorCode);
            $this->assertSame($message, $e->getMessage());

            return $e;
        }
        $this->fail("debía lanzar $code");
    }

    public function test_credits_of_a_cost_never_go_below_one(): void
    {
        $p = $this->policy();
        $this->assertSame(1, $p->creditsOf(0));
        $this->assertSame(1, $p->creditsOf(500));
        $this->assertSame(2, $p->creditsOf(501));
        $this->assertSame(3, $p->creditsOf(1500));
    }

    /** @return array<string, array{string, string, int}> */
    public static function estimates(): array
    {
        return [
            'writing' => ['writing', 'deepseek-chat', 6], 'speaking' => ['speaking', 'deepseek-chat', 6],
            'reading' => ['reading', 'deepseek-chat', 5], 'tutor' => ['tutor', 'deepseek-chat', 3],
            'error' => ['error', 'deepseek-chat', 2], 'test' => ['test', 'deepseek-chat', 1],
            'unknown kind' => ['otro', 'deepseek-chat', 3], 'reasoner doubles' => ['writing', 'deepseek-reasoner', 12],
            'any reasoner' => ['test', 'x-reasoner-2', 2],
        ];
    }

    #[DataProvider('estimates')]
    public function test_estimated_credits(string $kind, string $model, int $expected): void
    {
        $this->assertSame($expected, $this->policy()->estimatedCredits($kind, $model));
    }

    public function test_pace(): void
    {
        $p = $this->policy();
        $p->assertPace(5, false);
        $p->assertPace(6, true);
        $this->assertRejects('too_fast', 'Vas muy rápido. Espera un minuto y vuelve a intentarlo.', fn () => $p->assertPace(6, false));
        $this->assertRejects('too_fast', 'Vas muy rápido. Espera un minuto y vuelve a intentarlo.', fn () => $p->assertPace(7, true));
    }

    public function test_anonymous_state_counts_the_larger_of_device_and_ip(): void
    {
        $state = $this->policy()->state(new QuotaUsage(0, 0, 0, 1000, 3000), null, $this->now());
        $this->assertSame([
            'authenticated' => false, 'used' => 6, 'limit' => 15, 'remaining' => 9, 'window' => 'total', 'resetsAt' => null,
            'globalRemaining' => 6000, 'spentTodayUsd' => 0.0, 'budgetUsd' => 3.0,
        ], $state->toArray());
    }

    public function test_anonymous_daily_window(): void
    {
        $state = $this->policy(['anon_window' => 'dia'])->state(new QuotaUsage(0, 0, 0, 0, 0), null, $this->now());
        $this->assertSame('día', $state->window);
        $this->assertSame(20, $state->limit);
        $this->assertSame('2026-11-07T00:00:00.000Z', $state->resetsAt);
    }

    public function test_user_state_has_daily_and_monthly(): void
    {
        $state = $this->policy()->state(new QuotaUsage(1_000_000, 2600, 9000, 0, 0), $this->user(5), $this->now());
        $this->assertSame([
            'authenticated' => true, 'used' => 6, 'limit' => 65, 'remaining' => 59, 'window' => 'día',
            'resetsAt' => '2026-11-07T00:00:00.000Z', 'monthlyUsed' => 18, 'monthlyLimit' => 900,
            'globalRemaining' => 4000, 'spentTodayUsd' => 1.0, 'budgetUsd' => 3.0,
        ], $state->toArray());
    }

    public function test_global_remaining_is_the_tighter_of_credits_and_money(): void
    {
        $byMoney = $this->policy()->state(new QuotaUsage(2_999_000, 0, 0, 0, 0), null, $this->now());
        $this->assertSame(2, $byMoney->globalRemaining);
        $byCredits = $this->policy(['global_daily' => 10])->state(new QuotaUsage(self::credits(4), 0, 0, 0, 0), null, $this->now());
        $this->assertSame(6, $byCredits->globalRemaining);
        // Sin techo en dólares (0) solo cuentan los créditos: 10000 − 7000.
        $usage = new QuotaUsage(3_500_000, 0, 0, 0, 0);
        $this->assertSame(3000, $this->policy(['global_daily' => 10000, 'global_daily_usd' => 0.0])->state($usage, null, $this->now())->globalRemaining);
        $this->assertSame(0, $this->policy(['global_daily' => 10000])->state($usage, null, $this->now())->globalRemaining);
    }

    public function test_global_remaining_is_clipped_to_zero_outside(): void
    {
        $state = $this->policy()->state(new QuotaUsage(3_500_000, 0, 0, 0, 0), null, $this->now());
        $this->assertSame(0, $state->globalRemaining);
        $this->assertSame(3.5, $state->spentTodayUsd);
    }

    public function test_global_limit_exhausted(): void
    {
        $p = $this->policy();
        $this->assertRejects('global_limit',
            'Hoy se ha alcanzado el límite de uso compartido de la app. Vuelve mañana o usa tu propia clave en Ajustes.',
            fn () => $p->check(new QuotaUsage(3_000_000, 0, 0, 0, 0), $this->user(), 1, false, $this->now()));
    }

    public function test_global_limit_does_not_fit_the_task(): void
    {
        $p = $this->policy();
        $this->assertRejects('global_limit',
            'Al presupuesto compartido de hoy ya no le cabe una tarea de este tamaño. Prueba mañana, con algo más corto, o pon tu propia clave en Ajustes.',
            fn () => $p->check(new QuotaUsage(2_999_000, 0, 0, 0, 0), null, 3, false, $this->now()));
    }

    public function test_global_is_checked_before_the_person(): void
    {
        $p = $this->policy();
        $this->assertRejects('global_limit',
            'Hoy se ha alcanzado el límite de uso compartido de la app. Vuelve mañana o usa tu propia clave en Ajustes.',
            fn () => $p->check(new QuotaUsage(3_000_000, 0, 0, self::credits(15), 0), null, 1, false, $this->now()));
    }

    public function test_user_daily_exhausted_carries_the_quota(): void
    {
        $p = $this->policy();
        $e = $this->assertRejects('user_daily_limit', 'Has gastado tus 60 créditos de hoy. Se renuevan a medianoche.',
            fn () => $p->check(new QuotaUsage(0, self::credits(60), self::credits(60), 0, 0), $this->user(), 1, false, $this->now()));
        $this->assertSame(['quota'], array_keys($e->extra));
        $this->assertSame(60, $e->extra['quota']['used']);
        $this->assertSame(900, $e->extra['quota']['monthlyLimit']);
    }

    public function test_user_daily_does_not_fit_the_task(): void
    {
        $p = $this->policy();
        $this->assertRejects('user_daily_limit',
            'Te quedan 2 créditos y esta tarea necesita unos 3. Prueba con un texto más corto, con el modelo rápido, o mañana.',
            fn () => $p->check(new QuotaUsage(0, self::credits(58), self::credits(58), 0, 0), $this->user(), 3, false, $this->now()));
    }

    public function test_user_bonus_adds_to_the_daily_limit(): void
    {
        $state = $this->policy()->check(new QuotaUsage(0, self::credits(60), self::credits(60), 0, 0), $this->user(3), 3, false, $this->now());
        $this->assertSame(63, $state->limit);
    }

    public function test_user_monthly_exhausted(): void
    {
        $p = $this->policy(['user_monthly' => 100]);
        $this->assertRejects('user_monthly_limit',
            'Has agotado tu cuota mensual. Se renueva el día 1, o puedes usar tu propia clave en Ajustes.',
            fn () => $p->check(new QuotaUsage(0, 0, self::credits(100), 0, 0), $this->user(), 1, false, $this->now()));
    }

    public function test_reserved_row_is_discounted_from_every_check(): void
    {
        // Con la fila propia (3 créditos) ya escrita: 60 usados, cabe justo.
        $state = $this->policy(['user_monthly' => 60])->check(
            new QuotaUsage(self::credits(60), self::credits(60), self::credits(60), 0, 0), $this->user(), 3, true, $this->now());
        $this->assertSame(60, $state->used);
        $this->assertSame(0, $state->remaining);
    }

    /** @return array<string, array{array<string, mixed>, bool, int, int, string}> */
    public static function anonymous(): array
    {
        return [
            'accounts, exhausted' => [[], true, 15, 1,
                'Has gastado los 15 créditos de prueba. Entra con tu correo para seguir; el resto de la app no necesita cuenta.'],
            'no accounts, daily, exhausted' => [['anon_window' => 'dia'], false, 20, 1,
                'Has gastado tus 20 créditos de hoy. Vuelven mañana, y el resto de la app sigue funcionando entera.'],
            'no accounts, total, exhausted' => [[], false, 15, 1,
                'Has gastado los 15 créditos de esta app. Puedes seguir con tu propia clave de DeepSeek desde Ajustes.'],
            'accounts, does not fit' => [[], true, 14, 2,
                'Te quedan 1 créditos de prueba y esta tarea necesita unos 2. Entra con tu correo y tendrás bastantes más.'],
            'no accounts, daily, does not fit' => [['anon_window' => 'dia'], false, 19, 2,
                'Te quedan 1 créditos y esta tarea necesita unos 2. Prueba con un texto más corto, o mañana.'],
            'no accounts, total, does not fit' => [[], false, 14, 2,
                'Te quedan 1 créditos y esta tarea necesita unos 2. Prueba con un texto más corto.'],
        ];
    }

    /** @param array<string, mixed> $limits */
    #[DataProvider('anonymous')]
    public function test_anonymous_limit_messages(array $limits, bool $accounts, int $usedCredits, int $cost, string $message): void
    {
        $p = $this->policy($limits, $accounts);
        $e = $this->assertRejects('anon_limit', $message,
            fn () => $p->check(new QuotaUsage(0, 0, 0, self::credits($usedCredits), 0), null, $cost, false, $this->now()));
        $this->assertSame($usedCredits, $e->extra['quota']['used']);
    }

    public function test_fits_returns_the_state(): void
    {
        $state = $this->policy()->check(new QuotaUsage(0, 0, 0, self::credits(13), 0), null, 2, false, $this->now());
        $this->assertSame(2, $state->remaining);
    }
}
