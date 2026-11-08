<?php

namespace App\Http\Controllers\Ai;

use App\Http\Support\ApiJson;
use App\Http\Support\ClientContext;
use Illuminate\Http\Request;
use Ruta\Ai\Application\ReadQuota;
use Ruta\Auth\Application\ResolveSession;
use Symfony\Component\HttpFoundation\Response;

/** `/api/quota` con cualquier método: `{quota, user, accounts}` (en ese orden). */
final class QuotaController
{
    public function __invoke(Request $request, ResolveSession $session, ReadQuota $quota): Response
    {
        $user = $session->handle(ClientContext::bearer($request));
        $state = $quota->handle($user, ClientContext::deviceId($request), ClientContext::ipHash($request));

        return ApiJson::json($request, [
            'quota' => $state->toArray(),
            'user' => $user !== null ? ['email' => $user->email] : null,
            'accounts' => (bool) config('ruta.accounts_enabled'),
        ]);
    }
}
