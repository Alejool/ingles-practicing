<?php

namespace App\Http\Support;

use Illuminate\Http\Request;
use Ruta\Shared\Domain\DomainError;
use Symfony\Component\HttpFoundation\Response;

/**
 * Respuestas JSON de la API con las cabeceras de `json()` y `corsHeaders()` de la
 * API Node. Se usa `ApiResponse` y no `JsonResponse`: esta escapa `/` y no-ASCII,
 * y JSON.stringify no.
 */
final class ApiJson
{
    public const ENCODE_FLAGS = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR;

    /**
     * Lista de `ALLOWED_ORIGINS`; sin definir o vacía, `*`.
     *
     * @return list<string>
     */
    public static function parseOrigins(?string $env): array
    {
        $raw = $env === null || $env === '' ? '*' : $env;

        return array_values(array_filter(array_map('trim', explode(',', $raw)), fn (string $o) => $o !== ''));
    }

    /** @return array<string, string> */
    public static function corsHeaders(?string $origin): array
    {
        /** @var list<string> $allowed */
        $allowed = config('ruta.allowed_origins', ['*']);
        $origin ??= '';

        $allow = match (true) {
            in_array('*', $allowed, true) => '*',
            in_array($origin, $allowed, true) => $origin,
            default => $allowed[0] ?? '',
        };

        return [
            'Access-Control-Allow-Origin' => $allow,
            'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Device-Id',
            'Access-Control-Allow-Methods' => 'GET, POST, PUT, OPTIONS',
            'Access-Control-Max-Age' => '86400',
            'Vary' => 'Origin',
        ];
    }

    /**
     * @param  array<string, string>  $extra  cabeceras que sustituyen a las de por defecto
     */
    public static function json(Request $request, mixed $body, int $status = 200, array $extra = []): Response
    {
        return new ApiResponse(self::encode($body), $status, [
            ...self::corsHeaders($request->headers->get('Origin')),
            'Content-Type' => 'application/json; charset=utf-8',
            'Cache-Control' => 'no-store',
            ...$extra,
        ]);
    }

    public static function error(Request $request, DomainError $e): Response
    {
        return self::json($request, ErrorMap::payload($e), ErrorMap::status($e));
    }

    public static function serverError(Request $request): Response
    {
        return self::error($request, new DomainError('server_error'));
    }

    public static function preflight(Request $request): Response
    {
        return new ApiResponse(null, 204, self::corsHeaders($request->headers->get('Origin')));
    }

    /**
     * Error que en Node escribe `server/index.mts` y no `fail()`: JSON sin charset y
     * sin CORS. El tope de cuerpo lo manda sin `Cache-Control` (`$cacheControl` null).
     */
    public static function bare(int $status, string $code, string $message, ?string $cacheControl = 'no-store'): Response
    {
        $headers = ['Content-Type' => 'application/json'];
        if ($cacheControl !== null) {
            $headers['Cache-Control'] = $cacheControl;
        }

        return new ApiResponse(self::encode(['error' => ['code' => $code, 'message' => $message]]), $status, $headers);
    }

    public static function encode(mixed $body): string
    {
        return json_encode($body, self::ENCODE_FLAGS);
    }
}
