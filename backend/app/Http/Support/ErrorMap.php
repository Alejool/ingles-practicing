<?php

namespace App\Http\Support;

use Ruta\Shared\Domain\DomainError;

/**
 * Código de error → estado HTTP. Un código que no está aquí es un fallo de
 * programación: sale como 500 `server_error` sin detalle.
 */
final class ErrorMap
{
    private const STATUS = [
        'bad_json' => 400,
        'not_authenticated' => 401,
        'anon_limit' => 402,
        'account_blocked' => 403,
        'forbidden' => 403,
        'accounts_off' => 404,
        'not_found' => 404,
        'method_not_allowed' => 405,
        'version_conflict' => 409,
        'bad_email' => 422,
        'bad_id' => 422,
        'bad_kind' => 422,
        'bad_payload' => 422,
        'bad_progress' => 422,
        'payload_too_large' => 422,
        'too_fast' => 429,
        'too_many_links' => 429,
        'user_daily_limit' => 429,
        'user_monthly_limit' => 429,
        'schema_missing' => 500,
        'mail_failed' => 502,
        'provider_error' => 502,
        'provider_no_credit' => 502,
        'global_limit' => 503,
    ];

    public static function status(DomainError $e): int
    {
        if ($e instanceof HttpError) {
            return $e->status;
        }

        return self::STATUS[$e->errorCode] ?? 500;
    }

    /**
     * Cuerpo `{"error":{code, message, ...extra}}`. `extra` no puede pisar `code` ni
     * `message` (se descartan esas claves; el orden de las demás se mantiene).
     *
     * @return array{error: array<string, mixed>}
     */
    public static function payload(DomainError $e): array
    {
        if (! $e instanceof HttpError && ! isset(self::STATUS[$e->errorCode])) {
            return ['error' => ['code' => 'server_error', 'message' => 'Error interno']];
        }

        return ['error' => [
            'code' => $e->errorCode,
            'message' => $e->getMessage(),
            ...array_diff_key($e->extra, ['code' => true, 'message' => true]),
        ]];
    }
}
