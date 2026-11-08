<?php

namespace App\Http\Requests;

use Ruta\Progress\Application\PutProgressCommand;
use Ruta\Shared\Domain\DomainError;

/**
 * `PUT /api/progress`: cuerpo ≤ PROGRESS_MAX_KB (en caracteres) con `data` objeto y
 * `version` (solo cuenta si es un número finito; si no, 0).
 */
final class PutProgressRequest extends ApiRequest
{
    public function toCommand(): PutProgressCommand
    {
        $body = $this->jsonBody((int) config('ruta.progress_max_kb') * 1024);

        $data = self::field($body, 'data');
        if (! $data instanceof \stdClass) {
            throw new DomainError('bad_progress', 'El progreso enviado no es válido.');
        }
        $version = self::field($body, 'version');

        return new PutProgressCommand($data, is_int($version) || (is_float($version) && is_finite($version)) ? $version : 0);
    }
}
