<?php

namespace Tests\Feature\Ai;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Ruta\Ai\Application\ChatCommand;
use Ruta\Ai\Application\StreamChat;
use Ruta\Ai\Domain\ChatModel;
use Ruta\Shared\Domain\DomainError;
use Tests\Support\FakeChatModel;
use Tests\TestCase;

/**
 * StreamChat con un modelo simulado, contra Postgres (`ruta_test`) por la reserva.
 * Cada test en una transacción que se deshace.
 */
final class StreamChatTest extends TestCase
{
    use DatabaseTransactions;

    private const USAGE_LINE = "data: {\"choices\":[],\"usage\":{\"prompt_tokens\":1000,\"completion_tokens\":500}}\n\n";

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'ruta.quota.per_minute' => 1000, 'ruta.quota.anon_lifetime' => 1000, 'ruta.quota.global_daily' => 1_000_000,
            'ruta.quota.global_daily_usd' => 0.0, 'ruta.quota.max_tokens' => 2048,
        ]);
    }

    private function use(FakeChatModel $model): FakeChatModel
    {
        $this->app->instance(ChatModel::class, $model);

        return $model;
    }

    private static function command(string $kind = 'error', string $model = 'deepseek-chat', mixed $payload = null): ChatCommand
    {
        return new ChatCommand($kind, $model, 'chat-dispositivo', 'chat-ip', $payload ?? json_decode('{"text":"I has a dog"}'));
    }

    /** @return list<string> */
    private function relay(ChatCommand $cmd): array
    {
        $out = [];
        foreach (app(StreamChat::class)->start(null, $cmd)->chunks() as $chunk) {
            $out[] = $chunk;
        }

        return $out;
    }

    private function row(): object
    {
        return DB::selectOne("select prompt_tokens, completion_tokens, cost_micros, ok from ai_usage where device_id = 'chat-dispositivo'");
    }

    private function rejects(string $code, string $message, callable $fn): void
    {
        try {
            $fn();
            $this->fail("debía lanzar $code");
        } catch (DomainError $e) {
            $this->assertSame([$code, $message], [$e->errorCode, $e->getMessage()]);
        }
    }

    public function test_chunks_pass_through_byte_for_byte(): void
    {
        $chunks = ["data: {\"x\":\"ñandú → 😀\"}\n\n", "data: {\"y\"", ":1}\n\n", "data: [DONE]\n\n", "\xF0\x9F"];
        $this->use(FakeChatModel::ok($chunks));
        $this->assertSame($chunks, $this->relay(self::command()));
    }

    public function test_usage_split_across_chunks_settles_the_real_cost(): void
    {
        $this->use(FakeChatModel::ok([substr(self::USAGE_LINE, 0, 40), substr(self::USAGE_LINE, 40), "data: [DONE]\n\n"]));
        $this->relay(self::command());
        $row = $this->row();
        $this->assertSame([1000, 500, 820, true], [$row->prompt_tokens, $row->completion_tokens, $row->cost_micros, $row->ok]);
    }

    public function test_a_final_usage_line_without_trailing_newline_still_settles(): void
    {
        $this->use(FakeChatModel::ok(["data: {\"choices\":[]}\n\n", rtrim(self::USAGE_LINE, "\n")]));
        $this->relay(self::command());
        $row = $this->row();
        $this->assertSame([1000, 500, 820], [$row->prompt_tokens, $row->completion_tokens, $row->cost_micros]);
    }

    public function test_without_usage_the_reservation_stays(): void
    {
        $this->use(FakeChatModel::ok(["data: {\"choices\":[]}\n\n", "data: [DONE]\n\n"]));
        $this->relay(self::command());
        $row = $this->row();
        $this->assertSame([0, 0, 1000, true], [$row->prompt_tokens, $row->completion_tokens, $row->cost_micros, $row->ok]);
    }

    public function test_the_reservation_exists_before_the_model_is_called(): void
    {
        $model = $this->use(FakeChatModel::ok(["data: [DONE]\n\n"]));
        $stream = app(StreamChat::class)->start(null, self::command());
        $this->assertCount(1, $model->requests);
        $this->assertSame(1000, $this->row()->cost_micros);
        $this->assertNotNull($stream);
    }

    public function test_unreachable_model_annuls_and_is_provider_error(): void
    {
        $this->use(FakeChatModel::unreachable());
        $this->rejects('provider_error', 'El servicio de IA no está respondiendo. Inténtalo en un momento.', fn () => $this->relay(self::command()));
        $this->assertFalse($this->row()->ok);
    }

    public function test_rejected_call_annuls_and_is_provider_error(): void
    {
        $this->use(FakeChatModel::failing(500, '{"error":"x"}'));
        $this->rejects('provider_error', 'El servicio de IA no está respondiendo. Inténtalo en un momento.', fn () => $this->relay(self::command()));
        $this->assertFalse($this->row()->ok);
    }

    public function test_402_is_provider_no_credit(): void
    {
        $this->use(FakeChatModel::failing(402, '{"error":"Insufficient Balance"}'));
        $this->rejects('provider_no_credit', 'El servicio de IA se ha quedado sin saldo. Avisa a quien administra la app.',
            fn () => $this->relay(self::command()));
        $this->assertFalse($this->row()->ok);
    }

    public function test_bad_payload_writes_nothing_and_calls_nothing(): void
    {
        $model = $this->use(FakeChatModel::ok([]));
        $this->rejects('bad_payload', 'Falta la frase.', fn () => $this->relay(self::command(payload: json_decode('{}'))));
        $this->assertSame([], $model->requests);
        $this->assertNull(DB::selectOne("select 1 from ai_usage where device_id = 'chat-dispositivo'"));
    }

    public function test_request_body_sent_to_the_model(): void
    {
        $model = $this->use(FakeChatModel::ok([]));
        $this->relay(self::command('test'));
        $this->relay(self::command('error', 'deepseek-reasoner'));

        [$test, $error] = $model->requests;
        $this->assertSame(['model', 'messages', 'stream', 'stream_options', 'temperature', 'max_tokens'], array_keys($test));
        $this->assertSame('deepseek-chat', $test['model']);
        $this->assertSame([['role' => 'system', 'content' => 'Reply with exactly: OK'], ['role' => 'user', 'content' => 'ping']], $test['messages']);
        $this->assertTrue($test['stream']);
        $this->assertSame(['include_usage' => true], $test['stream_options']);
        $this->assertSame(0, $test['temperature']);
        $this->assertSame(2048, $test['max_tokens']);
        $this->assertSame(1, $error['temperature']);
        $this->assertSame('deepseek-reasoner', $error['model']);
    }

    public function test_max_tokens_is_capped_at_4096(): void
    {
        config(['ruta.quota.max_tokens' => 9000]);
        $model = $this->use(FakeChatModel::ok([]));
        $this->relay(self::command('test'));
        $this->assertSame(4096, $model->requests[0]['max_tokens']);
    }
}
