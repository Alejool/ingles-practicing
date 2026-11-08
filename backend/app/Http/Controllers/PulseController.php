<?php

namespace App\Http\Controllers;

use App\Http\Requests\RecordBeatRequest;
use App\Http\Support\ApiJson;
use Ruta\Pulse\Application\RecordBeat;
use Ruta\Shared\Domain\Tracks;
use Symfony\Component\HttpFoundation\Response;

/** `POST /api/pulse`: latido anónimo. Con PULSE_ENABLED=false responde sin leer el cuerpo. */
final class PulseController
{
    public function __invoke(RecordBeatRequest $request, RecordBeat $record, Tracks $tracks): Response
    {
        $request->assertMethod('POST');
        if (! config('ruta.pulse_enabled')) {
            return ApiJson::json($request, ['ok' => true, 'off' => true]);
        }

        $record->handle($request->toCommand($tracks));

        return ApiJson::json($request, ['ok' => true]);
    }
}
