<?php

namespace App\Http\Requests;

use App\Http\Support\ClientContext;
use Ruta\Pulse\Application\RecordBeatCommand;
use Ruta\Pulse\Domain\Beat;
use Ruta\Shared\Domain\Tracks;

/** `POST /api/pulse`: cuerpo ≤ 8 KB; el dispositivo, de la cabecera o de `device_id`. */
final class RecordBeatRequest extends ApiRequest
{
    private const MAX_UNITS = 8 * 1024;

    public function toCommand(Tracks $tracks): RecordBeatCommand
    {
        $body = $this->jsonBody(self::MAX_UNITS);

        return new RecordBeatCommand(
            ClientContext::deviceId($this, self::field($body, 'device_id')),
            Beat::fromBody($body, $tracks),
        );
    }
}
