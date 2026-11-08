<?php

namespace App\Http\Controllers\Auth;

use App\Http\Requests\RequestLinkRequest;
use App\Http\Support\ApiJson;
use Ruta\Auth\Application\RequestLoginLink;
use Symfony\Component\HttpFoundation\Response;

/**
 * `POST /api/auth/request`: manda el enlace mágico. Orden de auth-request.mts:
 * 405 → `accounts_off` → cuerpo → `bad_email` → límites → envío.
 */
final class RequestLinkController
{
    public function __invoke(RequestLinkRequest $request, RequestLoginLink $useCase): Response
    {
        $request->assertMethod('POST');
        $useCase->assertAccountsEnabled();
        $result = $useCase->handle($request->toCommand());

        return ApiJson::json($request, [
            'ok' => true,
            'minutes' => $result->minutes,
            'delivery' => $result->delivery->mode,
            'mailboxUrl' => $result->delivery->mailboxUrl,
        ]);
    }
}
