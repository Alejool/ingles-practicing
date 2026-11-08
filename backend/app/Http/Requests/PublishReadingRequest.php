<?php

namespace App\Http\Requests;

use Ruta\Library\Application\PublishReadingCommand;
use Ruta\Library\Domain\PublishableId;
use Ruta\Library\Domain\ReadingValidator;
use Ruta\Shared\Domain\JsString;
use Ruta\Shared\Domain\Tracks;

/**
 * `/api/readings`: la ruta de la query y, al publicar, el cuerpo (≤ 128 KB) con
 * `data` (la lectura), `id`, `track`, `level` y `topic`.
 */
final class PublishReadingRequest extends ApiRequest
{
    private const MAX_UNITS = 128 * 1024;

    /** `?track=`: una ruta conocida o `b1b2`. */
    public function track(Tracks $tracks): string
    {
        return $tracks->orFallback($this->queryString('track') ?? '');
    }

    /** El id de `?id=…&read=1` si es una petición de contador; si no, null. */
    public function readCounterId(): ?string
    {
        $id = $this->queryString('id');

        return $id !== null && $id !== '' && ($this->queryString('read') ?? '') !== '' ? $id : null;
    }

    public function since(): ?string
    {
        $after = $this->queryString('after');

        return $after !== null && $after !== '' ? $after : null;
    }

    public function toCommand(Tracks $tracks): PublishReadingCommand
    {
        $body = $this->jsonBody(self::MAX_UNITS);
        $reading = ReadingValidator::validate(self::field($body, 'data'));
        $id = PublishableId::from(self::field($body, 'id'));
        $bodyTrack = JsString::clip(self::field($body, 'track'), 8);
        $level = JsString::clip(self::field($body, 'level'), 8);

        return new PublishReadingCommand(
            $id,
            $tracks->has($bodyTrack) ? $bodyTrack : $this->track($tracks),
            $level !== '' ? $level : 'B2',
            JsString::clip(self::field($body, 'topic'), 120),
            $reading,
        );
    }

    /** `url.searchParams.get(name)`: un texto o null (una lista de PHP no cuenta). */
    private function queryString(string $name): ?string
    {
        $v = $this->query($name);

        return is_string($v) ? $v : null;
    }
}
