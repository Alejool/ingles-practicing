<?php

namespace App\Http\Requests;

use App\Http\Support\ClientContext;
use Ruta\Auth\Application\RequestLoginLinkCommand;
use Ruta\Auth\Domain\Email;

/** `POST /api/auth/request`: cuerpo ≤ 4096 caracteres con `email`. */
final class RequestLinkRequest extends ApiRequest
{
    private const MAX_UNITS = 4096;

    public function toCommand(): RequestLoginLinkCommand
    {
        $body = $this->jsonBody(self::MAX_UNITS);

        return new RequestLoginLinkCommand(
            Email::fromRaw(self::field($body, 'email')),
            ClientContext::ipHash($this),
            $this->headers->get('Origin'),
        );
    }
}
