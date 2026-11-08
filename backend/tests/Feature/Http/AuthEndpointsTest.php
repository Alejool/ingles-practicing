<?php

namespace Tests\Feature\Http;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Ruta\Auth\Domain\LoginLinkSender;
use Tests\Support\RecordingLinkSender;
use Tests\TestCase;

/**
 * Lo que la batería de contrato no puede fijar desde fuera con un solo entorno
 * (`ACCOUNTS_ENABLED=false`) y el orden de errores de /api/auth/request.
 */
final class AuthEndpointsTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->app->instance(LoginLinkSender::class, new RecordingLinkSender);
    }

    public function test_method_is_checked_before_accounts_off(): void
    {
        config(['ruta.accounts_enabled' => false]);
        $r = $this->call('GET', '/api/auth/request');
        $r->assertStatus(405);
        $this->assertSame('{"error":{"code":"method_not_allowed","message":"Método no permitido."}}', $r->getContent());
    }

    public function test_accounts_off_is_404_before_reading_the_body(): void
    {
        config(['ruta.accounts_enabled' => false]);
        $r = $this->call('POST', '/api/auth/request', content: '{roto');
        $r->assertStatus(404);
        $this->assertSame(
            '{"error":{"code":"accounts_off","message":"Esta instalación no usa cuentas: se estudia sin registrarse y el progreso se guarda en tu dispositivo."}}',
            $r->getContent());
        $this->assertSame('no-store', $r->headers->get('Cache-Control'));
    }

    public function test_verify_with_a_non_string_token_is_error(): void
    {
        config(['ruta.app_url' => 'http://app.test']);
        $r = $this->call('GET', '/api/auth/verify?token[]=x');
        $r->assertStatus(302);
        $this->assertSame('http://app.test/#auth=error', $r->headers->get('Location'));
    }
}
