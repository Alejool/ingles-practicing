<?php

namespace Tests\Feature\Http;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Ruta\Ai\Domain\ChatModel;
use Ruta\Shared\Domain\Hashing;
use Tests\Support\FakeChatModel;
use Tests\TestCase;

/**
 * /api/ai/chat con un modelo simulado, contra Postgres (`ruta_test`): cabeceras SSE y
 * `X-Quota-*` (con el «- 1» de hoy), orden de errores y reserva antes de llamar.
 */
final class ChatEndpointTest extends TestCase
{
    use DatabaseTransactions;

    private const DEVICE = 'chat-endpoint-1';

    private FakeChatModel $model;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'ruta.allowed_origins' => ['https://permitido.example'], 'ruta.accounts_enabled' => true,
            'ruta.quota.per_minute' => 6, 'ruta.quota.anon_lifetime' => 15, 'ruta.quota.anon_window' => 'total',
            'ruta.quota.global_daily' => 6000, 'ruta.quota.global_daily_usd' => 3.0, 'ruta.quota.credit_micros' => 500,
        ]);
        $this->model = FakeChatModel::ok(["data: {\"a\":1}\n\n", "data: [DONE]\n\n"]);
        $this->app->instance(ChatModel::class, $this->model);
    }

    private function chat(string $body, string $method = 'POST', array $server = []): TestResponse
    {
        return $this->call($method, '/api/ai/chat', server: ['HTTP_X_DEVICE_ID' => self::DEVICE, ...$server], content: $body);
    }

    private function assertError(TestResponse $r, int $status, string $code): void
    {
        $r->assertStatus($status);
        $this->assertSame($code, json_decode((string) $r->getContent())->error->code, (string) $r->getContent());
        $this->assertSame('https://permitido.example', $r->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_stream_headers_and_body(): void
    {
        $r = $this->chat('{"kind":"test","payload":{}}', server: ['HTTP_ORIGIN' => 'https://permitido.example']);

        $r->assertOk();
        $this->assertSame("data: {\"a\":1}\n\ndata: [DONE]\n\n", $r->streamedContent());
        $this->assertSame('text/event-stream; charset=utf-8', $r->headers->get('Content-Type'));
        $this->assertSame('no-store, no-transform', $r->headers->get('Cache-Control'));
        $this->assertSame('no', $r->headers->get('X-Accel-Buffering'));
        // Reserva de 1 crédito → quedan 14; la cabecera resta otro (lo arregla tutor-contextual).
        $this->assertSame('13', $r->headers->get('X-Quota-Remaining'));
        $this->assertSame('15', $r->headers->get('X-Quota-Limit'));
        $this->assertSame('total', $r->headers->get('X-Quota-Window'));
        $this->assertSame('https://permitido.example', $r->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_remaining_header_never_goes_below_zero(): void
    {
        config(['ruta.quota.anon_lifetime' => 1]);
        $this->assertSame('0', $this->chat('{"kind":"test"}')->headers->get('X-Quota-Remaining'));
    }

    public function test_error_order(): void
    {
        $this->assertError($this->chat('{"kind":"test"}', 'GET'), 405, 'method_not_allowed');
        $this->assertError($this->chat('{kind'), 400, 'bad_json');
        $this->assertError($this->chat('{"kind":"nada","x":"'.str_repeat('a', 96 * 1024).'"}'), 413, 'payload_too_large');
        $this->assertError($this->chat('{"kind":"nada"}'), 422, 'bad_kind');
        $this->assertError($this->chat('{"kind":"writing","payload":{}}'), 422, 'bad_payload');
        $this->assertSame([], $this->model->requests);
    }

    public function test_blocked_account_goes_before_bad_payload(): void
    {
        $user = (string) DB::scalar("insert into users (email, blocked) values ('bloqueado@example.com', true) returning id");
        DB::insert("insert into sessions (user_id, token_hash, expires_at) values (?, ?, now() + interval '1 day')",
            [$user, Hashing::sha256Hex('token-bloqueado')]);
        $this->assertError($this->chat('{"kind":"writing","payload":{}}', server: ['HTTP_AUTHORIZATION' => 'Bearer token-bloqueado']),
            403, 'account_blocked');
    }

    public function test_unknown_model_falls_back_to_deepseek_chat(): void
    {
        $this->chat('{"kind":"test","model":"gpt-9"}')->streamedContent();
        $this->chat('{"kind":"test","model":"deepseek-reasoner"}')->streamedContent();
        $this->assertSame(['deepseek-chat', 'deepseek-reasoner'], array_column($this->model->requests, 'model'));
    }

    public function test_device_can_come_in_the_body(): void
    {
        $this->call('POST', '/api/ai/chat', content: '{"kind":"test","device_id":"cuerpo-12345"}')->streamedContent();
        $this->assertSame(1, DB::scalar("select count(*)::int from ai_usage where device_id = 'cuerpo-12345'"));
    }

    public function test_quota_errors_come_before_calling_the_model(): void
    {
        config(['ruta.quota.anon_lifetime' => 0]);
        $r = $this->chat('{"kind":"test"}');
        $this->assertError($r, 402, 'anon_limit');
        $this->assertSame(['authenticated', 'used', 'limit', 'remaining', 'window', 'resetsAt', 'globalRemaining', 'spentTodayUsd', 'budgetUsd'],
            array_keys((array) json_decode((string) $r->getContent())->error->quota));
        $this->assertSame([], $this->model->requests);
    }

    public function test_provider_failure_is_502_json(): void
    {
        $this->app->instance(ChatModel::class, FakeChatModel::failing(402, 'sin saldo'));
        $this->assertError($this->chat('{"kind":"test"}'), 502, 'provider_no_credit');
    }
}
