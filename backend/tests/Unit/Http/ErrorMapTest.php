<?php

namespace Tests\Unit\Http;

use App\Http\Support\ErrorMap;
use App\Http\Support\HttpError;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Ruta\Shared\Domain\DomainError;

/** Código de error estable → estado HTTP, como los `ApiError` de netlify/functions. */
final class ErrorMapTest extends TestCase
{
    /** @return array<string, array{string, int}> */
    public static function codes(): array
    {
        return [
            'not_authenticated' => ['not_authenticated', 401],
            'anon_limit' => ['anon_limit', 402],
            'account_blocked' => ['account_blocked', 403],
            'forbidden' => ['forbidden', 403],
            'accounts_off' => ['accounts_off', 404],
            'not_found' => ['not_found', 404],
            'method_not_allowed' => ['method_not_allowed', 405],
            'version_conflict' => ['version_conflict', 409],
            'bad_email' => ['bad_email', 422],
            'bad_id' => ['bad_id', 422],
            'bad_kind' => ['bad_kind', 422],
            'bad_payload' => ['bad_payload', 422],
            'bad_progress' => ['bad_progress', 422],
            // En el dominio (lectura > 1500 palabras) es 422; el 413 del cuerpo lo pone JsonBody.
            'payload_too_large' => ['payload_too_large', 422],
            'too_fast' => ['too_fast', 429],
            'too_many_links' => ['too_many_links', 429],
            'user_daily_limit' => ['user_daily_limit', 429],
            'user_monthly_limit' => ['user_monthly_limit', 429],
            'schema_missing' => ['schema_missing', 500],
            'mail_failed' => ['mail_failed', 502],
            'provider_error' => ['provider_error', 502],
            'provider_no_credit' => ['provider_no_credit', 502],
            'global_limit' => ['global_limit', 503],
        ];
    }

    #[DataProvider('codes')]
    public function test_known_code_maps_to_its_status(string $code, int $status): void
    {
        $e = new DomainError($code, 'Mensaje');

        $this->assertSame($status, ErrorMap::status($e));
        $this->assertSame(['error' => ['code' => $code, 'message' => 'Mensaje']], ErrorMap::payload($e));
    }

    public function test_extra_fields_follow_code_and_message(): void
    {
        $e = new DomainError('version_conflict', 'Conflicto', ['server' => ['version' => 3]]);

        $this->assertSame(
            ['error' => ['code' => 'version_conflict', 'message' => 'Conflicto', 'server' => ['version' => 3]]],
            ErrorMap::payload($e),
        );
    }

    public function test_extra_can_never_override_code_or_message(): void
    {
        $e = new DomainError('too_fast', 'Despacio', ['code' => 'x', 'message' => 'y', 'retry_after' => 5]);

        $this->assertSame(
            ['error' => ['code' => 'too_fast', 'message' => 'Despacio', 'retry_after' => 5]],
            ErrorMap::payload($e),
        );
    }

    public function test_message_defaults_to_the_code(): void
    {
        $this->assertSame('bad_id', (new DomainError('bad_id'))->getMessage());
    }

    public function test_http_error_keeps_its_own_status(): void
    {
        $e = new HttpError(413, 'payload_too_large', 'El texto enviado es demasiado largo.');

        $this->assertSame(413, ErrorMap::status($e));
        $this->assertSame('payload_too_large', ErrorMap::payload($e)['error']['code']);
    }

    public function test_unknown_code_is_a_hidden_server_error(): void
    {
        $e = new DomainError('algo_raro', 'detalle interno que no debe salir', ['sql' => 'select']);

        $this->assertSame(500, ErrorMap::status($e));
        $this->assertSame(['error' => ['code' => 'server_error', 'message' => 'Error interno']], ErrorMap::payload($e));
    }
}
