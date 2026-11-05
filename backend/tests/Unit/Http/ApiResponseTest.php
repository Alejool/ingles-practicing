<?php

namespace Tests\Unit\Http;

use App\Http\Support\ApiJson;
use App\Http\Support\ApiResponse;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

/**
 * Cabeceras byte a byte como la API Node. La `Response` de Symfony reescribe
 * `Cache-Control` (`no-store` → `no-store, private`, sin cabecera → `no-cache, private`,
 * directivas ordenadas) y el contrato compara la cadena exacta.
 */
final class ApiResponseTest extends TestCase
{
    /** @return array<string, array{string}> */
    public static function cacheControls(): array
    {
        return [
            'no-store' => ['no-store'],
            'lecturas' => ['public, max-age=120'],
            'streaming' => ['no-store, no-transform'],
        ];
    }

    #[DataProvider('cacheControls')]
    public function test_cache_control_is_sent_exactly_as_given(string $value): void
    {
        $response = new ApiResponse('{}', 200, ['Cache-Control' => $value]);
        $response->prepare(Request::create('/api/x', 'POST'));

        $this->assertSame($value, $response->headers->get('Cache-Control'));
    }

    public function test_without_cache_control_there_is_no_header(): void
    {
        $response = new ApiResponse('{}', 200, ['Content-Type' => 'application/json']);
        $response->prepare(Request::create('/api/x', 'POST'));

        $this->assertFalse($response->headers->has('Cache-Control'));
        $this->assertSame('application/json', $response->headers->get('Content-Type'));
    }

    /** @return array<string, array{int, string, string, string}> */
    public static function bareErrors(): array
    {
        return [
            'gone' => [410, 'gone', 'Este endpoint ya no existe. Usa /api/ai/chat.',
                '{"error":{"code":"gone","message":"Este endpoint ya no existe. Usa /api/ai/chat."}}'],
            'not_found' => [404, 'not_found', 'Endpoint desconocido',
                '{"error":{"code":"not_found","message":"Endpoint desconocido"}}'],
        ];
    }

    #[DataProvider('bareErrors')]
    public function test_bare_error_is_json_without_charset_nor_cors(int $status, string $code, string $message, string $body): void
    {
        $response = ApiJson::bare($status, $code, $message);

        $this->assertSame($status, $response->getStatusCode());
        $this->assertSame($body, $response->getContent());
        $this->assertSame('application/json', $response->headers->get('Content-Type'));
        $this->assertSame('no-store', $response->headers->get('Cache-Control'));
        $this->assertFalse($response->headers->has('Access-Control-Allow-Origin'));
        $this->assertFalse($response->headers->has('Vary'));
    }

    public function test_bare_error_can_go_without_cache_control(): void
    {
        $response = ApiJson::bare(500, 'server_error', 'Error interno', cacheControl: null);

        $this->assertSame('{"error":{"code":"server_error","message":"Error interno"}}', $response->getContent());
        $this->assertFalse($response->headers->has('Cache-Control'));
    }
}
