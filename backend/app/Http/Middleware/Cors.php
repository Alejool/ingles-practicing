<?php

namespace App\Http\Middleware;

use App\Http\Support\ApiJson;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Preflight de los endpoints que lo tienen (`preflight()` de la API Node): un
 * OPTIONS se responde 204 con las cabeceras CORS antes de llegar al controlador.
 * Las demás respuestas llevan CORS porque las construye ApiJson.
 */
final class Cors
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('OPTIONS')) {
            return ApiJson::preflight($request);
        }

        return $next($request);
    }
}
