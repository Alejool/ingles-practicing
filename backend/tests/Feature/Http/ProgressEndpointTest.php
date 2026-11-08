<?php

namespace Tests\Feature\Http;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Ruta\Shared\Domain\Hashing;
use Tests\TestCase;

/** Borde HTTP de /api/progress: orden de errores, validación de `data` y `version`, tope. */
final class ProgressEndpointTest extends TestCase
{
    use DatabaseTransactions;

    private string $token = 'token-de-prueba-progreso';

    protected function setUp(): void
    {
        parent::setUp();
        config(['ruta.progress_max_kb' => 1]);
        $id = (string) DB::scalar("insert into users (email) values ('h@example.com') returning id");
        DB::insert("insert into sessions (user_id, token_hash, expires_at) values (?, ?, now() + interval '1 day')",
            [$id, Hashing::sha256Hex($this->token)]);
    }

    private function putProgress(string $body): \Illuminate\Testing\TestResponse
    {
        return $this->call('PUT', '/api/progress', server: ['HTTP_AUTHORIZATION' => "Bearer {$this->token}"], content: $body);
    }

    public function test_session_is_checked_before_the_method(): void
    {
        $r = $this->call('DELETE', '/api/progress');
        $r->assertStatus(401);
        $this->assertSame('{"error":{"code":"not_authenticated","message":"Inicia sesión para continuar."}}', $r->getContent());
    }

    public function test_other_methods_with_session_are_405(): void
    {
        $this->call('POST', '/api/progress', server: ['HTTP_AUTHORIZATION' => "Bearer {$this->token}"])->assertStatus(405);
    }

    /** @return array<string, array{string}> */
    public static function badData(): array
    {
        return [
            'missing' => ['{"version":0}'], 'null' => ['{"data":null}'], 'empty list' => ['{"data":[]}'],
            'list' => ['{"data":[1,2]}'], 'text' => ['{"data":"x"}'], 'number' => ['{"data":3}'],
            'true' => ['{"data":true}'], 'zero' => ['{"data":0}'], 'body is a list' => ['[]'], 'empty body' => [''],
        ];
    }

    #[\PHPUnit\Framework\Attributes\DataProvider('badData')]
    public function test_data_must_be_an_object(string $body): void
    {
        $r = $this->putProgress($body);
        $r->assertStatus(422);
        $this->assertSame('{"error":{"code":"bad_progress","message":"El progreso enviado no es válido."}}', $r->getContent());
    }

    public function test_string_version_counts_as_zero(): void
    {
        $this->putProgress('{"data":{"n":1}}')->assertOk();
        $this->putProgress('{"data":{"n":2},"version":"1"}')->assertStatus(409);
        $this->putProgress('{"data":{"n":2},"version":1}')->assertOk();
    }

    public function test_body_limit_is_progress_max_kb_in_characters(): void
    {
        $this->putProgress('{"data":{"x":"'.str_repeat('a', 1024).'"}}')->assertStatus(413);
        $this->putProgress('{"data":{"x":"'.str_repeat('é', 1000).'"}}')->assertOk();
    }
}
