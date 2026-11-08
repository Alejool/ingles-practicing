<?php

namespace App\Http\Controllers\Auth;

use App\Http\Support\ApiResponse;
use Illuminate\Http\Request;
use Ruta\Auth\Application\VerifyLoginLink;
use Symfony\Component\HttpFoundation\Response;

/**
 * `/api/auth/verify?token=…` con cualquier método (sin preflight): siempre 302 a
 * `<base>/#auth=…`, sin cuerpo, `no-store` y sin CORS.
 */
final class VerifyLinkController
{
    public function __invoke(Request $request, VerifyLoginLink $useCase): Response
    {
        $token = $request->query('token');
        $location = $useCase->handle(is_string($token) ? $token : '', $request->headers->get('User-Agent'));

        return new ApiResponse(null, 302, ['Location' => $location, 'Cache-Control' => 'no-store']);
    }
}
