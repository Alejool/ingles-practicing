<?php

namespace App\Http\Requests;

use App\Http\Support\ClientContext;
use Ruta\Ai\Application\ChatCommand;
use Ruta\Ai\Domain\AiKind;
use Ruta\Shared\Domain\DomainError;

/**
 * `POST /api/ai/chat`: cuerpo ≤ 96 KB (en caracteres) con `kind`, `model` (lista
 * blanca; si no, `deepseek-chat`), `payload` y, opcional, `device_id`.
 */
final class ChatRequest extends ApiRequest
{
    private const MODELS = ['deepseek-chat', 'deepseek-reasoner'];

    public function toCommand(): ChatCommand
    {
        $body = $this->jsonBody();
        $kind = self::field($body, 'kind');
        if (! AiKind::isKind($kind)) {
            throw new DomainError('bad_kind', 'Tipo de petición no reconocido.');
        }
        $model = self::field($body, 'model');

        return new ChatCommand(
            $kind,
            in_array($model, self::MODELS, true) ? $model : self::MODELS[0],
            ClientContext::deviceId($this, self::field($body, 'device_id')),
            ClientContext::ipHash($this),
            // `body?.payload ?? {}`.
            self::field($body, 'payload') ?? new \stdClass,
        );
    }
}
