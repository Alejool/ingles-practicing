<?php

namespace Tests\Feature\Ai;

use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Ruta\Ai\Application\ReadQuota;
use Ruta\Ai\Application\ReserveCredits;
use Ruta\Ai\Application\SettleUsage;
use Ruta\Auth\Domain\SessionUser;
use Ruta\Shared\Domain\DomainError;
use Tests\TestCase;

/**
 * Reserva y lectura de cuota contra Postgres (`ruta_test`), con los casos de
 * tests/quota.test.mts que no son de concurrencia real. Cada test en una
 * transacción que se deshace.
 *
 * La carrera de dos peticiones de verdad (dos conexiones) necesitaría confirmar
 * filas y que la perdedora haga `update … ok = false` sobre una fila confirmada:
 * las reglas de datos no lo permiten. Se reproduce de forma determinista en una
 * transacción, metiendo la fila de la otra petición justo después de nuestra
 * reserva (antes de la segunda comprobación), que es el hueco que cubre el algoritmo.
 */
final class QuotaUseCasesTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'ruta.accounts_enabled' => true,
            'ruta.quota.anon_lifetime' => 15,
            'ruta.quota.anon_window' => 'total',
            'ruta.quota.user_daily' => 10,
            'ruta.quota.user_monthly' => 900,
            'ruta.quota.global_daily' => 6000,
            'ruta.quota.global_daily_usd' => 3.0,
            'ruta.quota.per_minute' => 1000,
            'ruta.quota.credit_micros' => 500,
        ]);
    }

    private function reserve(?SessionUser $user = null, string $device = 'dispositivo-1', string $ip = 'ip-1', string $kind = 'error', string $model = 'deepseek-chat'): string
    {
        return app(ReserveCredits::class)->handle($user, $device, $ip, $kind, $model)->id;
    }

    private function charged(): float
    {
        return (int) DB::scalar('select coalesce(sum(cost_micros), 0)::bigint from ai_usage where ok') / 500;
    }

    private function rejects(string $code, callable $fn): void
    {
        try {
            $fn();
            $this->fail("debía lanzar $code");
        } catch (DomainError $e) {
            $this->assertSame($code, $e->errorCode, $e->getMessage());
        }
    }

    private function user(): SessionUser
    {
        $id = (string) DB::scalar("insert into users (email) values ('a@example.com') returning id");

        return new SessionUser($id, 'a@example.com', 0, false);
    }

    public function test_in_series_admits_exactly_what_fits_and_a_rejection_writes_nothing(): void
    {
        // «error» con el modelo rápido reserva 2 créditos: en 15 caben 7.
        for ($k = 0; $k < 7; $k++) {
            $this->reserve();
        }
        $this->rejects('anon_limit', fn () => $this->reserve());
        $this->assertSame(14.0, $this->charged());
        $this->assertSame(7, DB::scalar('select count(*)::int from ai_usage'));
    }

    public function test_the_reservation_row_carries_the_estimate_and_the_caller(): void
    {
        $user = $this->user();
        $id = $this->reserve($user, 'dispositivo-1', 'ip-1', 'writing', 'deepseek-chat');
        $row = DB::selectOne('select user_id, device_id, ip_hash, kind, model, cost_micros, ok, prompt_tokens from ai_usage where id = ?', [$id]);
        $this->assertSame([$user->id, 'dispositivo-1', 'ip-1', 'writing', 'deepseek-chat', 3000, true, 0],
            [$row->user_id, $row->device_id, $row->ip_hash, $row->kind, $row->model, $row->cost_micros, $row->ok, $row->prompt_tokens]);
    }

    public function test_without_device_the_row_has_null_device(): void
    {
        $id = $this->reserve(null, '');
        $this->assertNull(DB::scalar('select device_id from ai_usage where id = ?', [$id]));
    }

    public function test_explicit_credits_replace_the_estimate(): void
    {
        $result = app(ReserveCredits::class)->handle(null, 'dispositivo-1', 'ip-1', 'tutor', 'deepseek-chat', 9);
        $this->assertSame(4500, DB::scalar('select cost_micros from ai_usage where id = ?', [$result->id]));
        $this->rejects('anon_limit', fn () => app(ReserveCredits::class)->handle(null, 'dispositivo-1', 'ip-1', 'tutor', 'deepseek-chat', 7));
    }

    public function test_changing_device_does_not_dodge_the_ip_limit(): void
    {
        for ($k = 0; $k < 7; $k++) {
            $this->reserve(null, "dispositivo-$k");
        }
        $this->rejects('anon_limit', fn () => $this->reserve(null, 'dispositivo-nuevo'));
    }

    public function test_user_daily_limit(): void
    {
        $user = $this->user();
        // «tutor» reserva 3 créditos: en 10 caben 3.
        for ($k = 0; $k < 3; $k++) {
            $this->reserve($user, 'dispositivo-1', 'ip-1', 'tutor');
        }
        $this->rejects('user_daily_limit', fn () => $this->reserve($user, 'dispositivo-1', 'ip-1', 'tutor'));
        $this->assertSame(9.0, $this->charged());
    }

    public function test_pace_limits_calls_per_minute(): void
    {
        config(['ruta.quota.per_minute' => 6, 'ruta.quota.anon_lifetime' => 1000]);
        for ($k = 0; $k < 6; $k++) {
            $this->reserve(null, 'dispositivo-1', 'ip-1', 'test');
        }
        $this->rejects('too_fast', fn () => $this->reserve(null, 'dispositivo-1', 'ip-otra', 'test'));
        $this->rejects('too_fast', fn () => $this->reserve(null, 'otro-dispositivo', 'ip-1', 'test'));
        $this->reserve(null, 'otro-dispositivo', 'ip-otra', 'test');
    }

    public function test_deployment_budget_in_credits(): void
    {
        config(['ruta.quota.global_daily' => 10]);
        for ($k = 0; $k < 10; $k++) {
            $this->reserve(null, "dispositivo-$k", "ip-$k", 'test');
        }
        $this->rejects('global_limit', fn () => $this->reserve(null, 'dispositivo-x', 'ip-x', 'test'));
    }

    public function test_annulled_reservation_is_not_charged(): void
    {
        $id = $this->reserve();
        $this->assertSame(2.0, $this->charged());
        app(ReserveCredits::class)->annul($id);
        $this->assertSame(0.0, $this->charged());
        $this->assertSame(1, DB::scalar('select count(*)::int from ai_usage where not ok'));
    }

    public function test_a_competitor_that_slips_in_after_our_insert_makes_us_lose_and_annul(): void
    {
        // 13 de 15 usados: cabe una reserva de 2, no dos.
        for ($k = 0; $k < 6; $k++) {
            $this->reserve();
        }
        DB::insert("insert into ai_usage (device_id, ip_hash, kind, model, cost_micros) values ('dispositivo-1', 'ip-1', 'test', 'deepseek-chat', 500)");

        $injected = false;
        Event::listen(QueryExecuted::class, function (QueryExecuted $q) use (&$injected) {
            if (! $injected && str_starts_with(trim($q->sql), 'insert into ai_usage (user_id, device_id, ip_hash, kind, model, cost_micros)')) {
                $injected = true;
                DB::insert("insert into ai_usage (device_id, ip_hash, kind, model, cost_micros) values ('dispositivo-1', 'ip-1', 'error', 'deepseek-chat', 1000)");
            }
        });

        $this->rejects('anon_limit', fn () => $this->reserve());
        $this->assertTrue($injected);
        $this->assertSame(15.0, $this->charged(), 'la otra petición se queda con su reserva');
        $this->assertSame(1, DB::scalar('select count(*)::int from ai_usage where not ok'), 'la nuestra queda anulada');
    }

    public function test_with_room_to_spare_every_reservation_passes(): void
    {
        config(['ruta.quota.anon_lifetime' => 100]);
        for ($k = 0; $k < 5; $k++) {
            $this->reserve();
        }
        $this->assertSame(10.0, $this->charged());
    }

    public function test_read_quota_anonymous_ignores_annulled_and_user_rows(): void
    {
        $user = $this->user();
        $this->reserve($user);
        $id = $this->reserve();
        $this->reserve();
        app(ReserveCredits::class)->annul($id);

        $state = app(ReadQuota::class)->handle(null, 'dispositivo-1', 'ip-1');
        $this->assertSame(2, $state->used);
        $this->assertSame(13, $state->remaining);
        $this->assertSame('total', $state->window);
        $this->assertNull($state->resetsAt);
    }

    public function test_read_quota_anonymous_ip_window_in_days(): void
    {
        DB::insert("insert into ai_usage (ip_hash, kind, model, cost_micros, created_at)
                    values ('ip-1', 'error', 'deepseek-chat', 2000, now() - interval '31 days'),
                           ('ip-1', 'error', 'deepseek-chat', 1000, now() - interval '29 days')");
        $this->assertSame(2, app(ReadQuota::class)->handle(null, '', 'ip-1')->used);
    }

    public function test_read_quota_anonymous_daily_window_counts_today_only(): void
    {
        config(['ruta.quota.anon_window' => 'dia']);
        DB::insert("insert into ai_usage (device_id, ip_hash, kind, model, cost_micros, day)
                    values ('dispositivo-1', 'ip-1', 'error', 'deepseek-chat', 5000, current_date - 1)");
        $this->reserve();
        $state = app(ReadQuota::class)->handle(null, 'dispositivo-1', 'ip-1');
        $this->assertSame(2, $state->used);
        $this->assertSame('día', $state->window);
        $this->assertNotNull($state->resetsAt);
    }

    public function test_read_quota_user_daily_and_monthly(): void
    {
        $user = $this->user();
        $this->reserve($user, 'd', 'ip', 'tutor');
        DB::insert("insert into ai_usage (user_id, ip_hash, kind, model, cost_micros, day)
                    values (?, 'ip', 'tutor', 'deepseek-chat', 2500, current_date - 1)", [$user->id]);
        $state = app(ReadQuota::class)->handle($user, 'd', 'ip');
        $this->assertSame(3, $state->used);
        $this->assertSame(7, $state->remaining);
        // El mes mira `created_at` (ahora en las dos filas); el día mira `day`.
        $this->assertSame(8, $state->monthlyUsed);
    }

    public function test_settle_replaces_the_estimate_with_the_real_cost(): void
    {
        $id = $this->reserve();
        app(SettleUsage::class)->handle($id, 'deepseek-chat', 1000, 500);
        $row = DB::selectOne('select prompt_tokens, completion_tokens, cost_micros from ai_usage where id = ?', [$id]);
        $this->assertSame([1000, 500, 820], [$row->prompt_tokens, $row->completion_tokens, $row->cost_micros]);
    }
}
