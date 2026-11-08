<?php

namespace App\Http\Controllers;

use App\Http\Requests\PublishReadingRequest;
use App\Http\Support\ApiJson;
use App\Http\Support\ClientContext;
use Ruta\Auth\Application\ResolveSession;
use Ruta\Library\Application\CountRead;
use Ruta\Library\Application\ListReadings;
use Ruta\Library\Application\PublishReading;
use Ruta\Shared\Domain\DomainError;
use Ruta\Shared\Domain\Tracks;
use Symfony\Component\HttpFoundation\Response;

/**
 * `/api/readings`: GET lista (público, caché corta); POST `?id=…&read=1` suma una
 * lectura sin cuenta; POST publica (con sesión).
 */
final class ReadingsController
{
    public function __invoke(
        PublishReadingRequest $request,
        Tracks $tracks,
        ListReadings $list,
        CountRead $count,
        ResolveSession $session,
        PublishReading $publish,
    ): Response {
        if ($request->isMethod('GET')) {
            $rows = $list->handle($request->track($tracks), $request->since());

            // Caché corta: la biblioteca cambia poco y así no se pega a la base.
            return ApiJson::json($request, ['textos' => $rows], 200, ['Cache-Control' => 'public, max-age=120']);
        }
        $request->assertMethod('POST');

        $readId = $request->readCounterId();
        if ($readId !== null) {
            $count->handle($readId);

            return ApiJson::json($request, ['ok' => true]);
        }

        $user = $session->handle(ClientContext::bearer($request))
            ?? throw new DomainError('not_authenticated', 'Entra con tu correo para publicar textos en la biblioteca.');
        $id = $publish->handle($user, $request->toCommand($tracks));

        return ApiJson::json($request, ['ok' => true, 'id' => $id]);
    }
}
