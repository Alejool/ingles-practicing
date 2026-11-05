<?php

namespace App\Http\Middleware;

use App\Http\Support\ApiJson;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Tope de 2 MB por cuerpo en los endpoints, como `toWebRequest` de server/index.mts:
 * pasado el tope responde 500 `server_error`, sin CORS ni `Cache-Control`, igual que hoy.
 * Va en el grupo `api` (todas las rutas de routes/api.php salvo `/healthz` y el 404,
 * que en Node no leen el cuerpo). GET y HEAD no leen cuerpo.
 */
final class BodyLimit
{
    public const MAX_BYTES = 2 * 1024 * 1024;

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->isMethod('GET') && ! $request->isMethod('HEAD')
            && strlen($request->getContent()) > self::MAX_BYTES) {
            return ApiJson::bare(500, 'server_error', 'Error interno', cacheControl: null);
        }

        return $next($request);
    }
}
