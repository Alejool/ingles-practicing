<?php

namespace App\Http\Controllers;

use App\Http\Requests\PutProgressRequest;
use App\Http\Support\ApiJson;
use App\Http\Support\ClientContext;
use Ruta\Auth\Application\ResolveSession;
use Ruta\Progress\Application\GetProgress;
use Ruta\Progress\Application\PutProgress;
use Symfony\Component\HttpFoundation\Response;

/** `/api/progress`: GET descarga, PUT sube. Exige sesión, y la sesión va antes que el 405. */
final class ProgressController
{
    public function __invoke(PutProgressRequest $request, ResolveSession $session, GetProgress $get, PutProgress $put): Response
    {
        $user = $session->require(ClientContext::bearer($request));

        if ($request->isMethod('GET')) {
            return ApiJson::json($request, $get->handle($user)->toArray());
        }
        $request->assertMethod('PUT');
        $saved = $put->handle($user, $request->toCommand());

        return ApiJson::json($request, ['version' => $saved->version, 'updatedAt' => $saved->updatedAt]);
    }
}
