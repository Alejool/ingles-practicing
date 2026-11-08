<?php

namespace App\Http\Controllers\Auth;

use App\Http\Support\ApiJson;
use App\Http\Support\ClientContext;
use Illuminate\Http\Request;
use Ruta\Ai\Application\ReadQuota;
use Ruta\Auth\Application\Logout;
use Ruta\Auth\Application\ResolveSession;
use Symfony\Component\HttpFoundation\Response;

/**
 * `/api/auth/session`: POST cierra la sesión del token; cualquier otro método dice
 * quién soy y cuánta cuota me queda: `{user, quota, accounts}` (en ese orden).
 */
final class SessionController
{
    public function __invoke(Request $request, ResolveSession $session, ReadQuota $quota, Logout $logout): Response
    {
        $bearer = ClientContext::bearer($request);
        if ($request->isMethod('POST')) {
            $logout->handle($bearer);

            return ApiJson::json($request, ['ok' => true]);
        }

        $user = $session->handle($bearer);
        $state = $quota->handle($user, ClientContext::deviceId($request), ClientContext::ipHash($request));

        return ApiJson::json($request, [
            'user' => $user !== null ? ['email' => $user->email] : null,
            'quota' => $state->toArray(),
            'accounts' => (bool) config('ruta.accounts_enabled'),
        ]);
    }
}
