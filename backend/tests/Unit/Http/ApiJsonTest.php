<?php

namespace Tests\Unit\Http;

use App\Http\Support\ApiJson;
use Illuminate\Http\Request;
use Ruta\Shared\Domain\DomainError;
use Tests\TestCase;

/** Igual que `corsHeaders`, `json` y `fail` de netlify/functions/_http.mts. */
final class ApiJsonTest extends TestCase
{
    private const ALLOW_HEADERS = 'Content-Type, Authorization, X-Device-Id';

    private const ALLOW_METHODS = 'GET, POST, PUT, OPTIONS';

    public function test_cors_with_wildcard_allows_any_origin(): void
    {
        config(['ruta.allowed_origins' => ['*']]);

        $this->assertSame([
            'Access-Control-Allow-Origin' => '*',
            'Access-Control-Allow-Headers' => self::ALLOW_HEADERS,
            'Access-Control-Allow-Methods' => self::ALLOW_METHODS,
            'Access-Control-Max-Age' => '86400',
            'Vary' => 'Origin',
        ], ApiJson::corsHeaders('https://cualquiera.example'));
    }

    public function test_cors_echoes_an_allowed_origin(): void
    {
        config(['ruta.allowed_origins' => ['https://a.example', 'https://b.example']]);

        $this->assertSame('https://b.example', ApiJson::corsHeaders('https://b.example')['Access-Control-Allow-Origin']);
    }

    public function test_cors_answers_foreign_origin_with_the_first_allowed(): void
    {
        config(['ruta.allowed_origins' => ['https://a.example', 'https://b.example']]);

        $this->assertSame('https://a.example', ApiJson::corsHeaders('https://ajeno.example')['Access-Control-Allow-Origin']);
        $this->assertSame('https://a.example', ApiJson::corsHeaders(null)['Access-Control-Allow-Origin']);
    }

    public function test_cors_with_empty_list_allows_nothing(): void
    {
        config(['ruta.allowed_origins' => []]);

        $this->assertSame('', ApiJson::corsHeaders('https://a.example')['Access-Control-Allow-Origin']);
    }

    public function test_allowed_origins_env_parsing(): void
    {
        $this->assertSame(['*'], ApiJson::parseOrigins(null));
        $this->assertSame(['*'], ApiJson::parseOrigins(''));
        $this->assertSame(['https://a.example', 'https://b.example'], ApiJson::parseOrigins(' https://a.example ,, https://b.example '));
    }

    public function test_json_response_headers_and_body(): void
    {
        config(['ruta.allowed_origins' => ['https://a.example']]);
        $request = Request::create('/api/x', 'GET', server: ['HTTP_ORIGIN' => 'https://a.example']);

        $response = ApiJson::json($request, ['ok' => true, 'texto' => 'á/é', 'n' => 0.0, 'o' => new \stdClass], 201, ['X-Extra' => '1']);

        // JSON.stringify(0.0) es "0": sin JSON_PRESERVE_ZERO_FRACTION.
        $this->assertSame(201, $response->getStatusCode());
        $this->assertSame('{"ok":true,"texto":"á/é","n":0,"o":{}}', $response->getContent());
        $this->assertSame('application/json; charset=utf-8', $response->headers->get('Content-Type'));
        $this->assertSame('no-store', $response->headers->get('Cache-Control'));
        $this->assertSame('https://a.example', $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertSame('Origin', $response->headers->get('Vary'));
        $this->assertSame('1', $response->headers->get('X-Extra'));
    }

    public function test_extra_headers_override_defaults(): void
    {
        $request = Request::create('/api/readings', 'GET');

        $response = ApiJson::json($request, [], 200, ['Cache-Control' => 'public, max-age=120']);

        $this->assertSame('public, max-age=120', $response->headers->get('Cache-Control'));
    }

    public function test_error_response_carries_cors(): void
    {
        config(['ruta.allowed_origins' => ['*']]);
        $request = Request::create('/api/progress', 'PUT');

        $response = ApiJson::error($request, new DomainError('bad_progress', 'Progreso inválido.'));

        $this->assertSame(422, $response->getStatusCode());
        $this->assertSame('{"error":{"code":"bad_progress","message":"Progreso inválido."}}', $response->getContent());
        $this->assertSame('*', $response->headers->get('Access-Control-Allow-Origin'));
    }

    public function test_preflight_is_204_with_cors_and_no_body(): void
    {
        config(['ruta.allowed_origins' => ['*']]);
        $request = Request::create('/api/quota', 'OPTIONS');

        $response = ApiJson::preflight($request);

        $this->assertSame(204, $response->getStatusCode());
        $this->assertSame('', $response->getContent());
        $this->assertSame('*', $response->headers->get('Access-Control-Allow-Origin'));
        $this->assertSame(self::ALLOW_METHODS, $response->headers->get('Access-Control-Allow-Methods'));
    }
}
