<?php

namespace App\Http\Support;

use Symfony\Component\HttpFoundation\Response;

/** Respuesta con `Cache-Control` tal cual se da, o sin él (ver RawHeaderBag). */
final class ApiResponse extends Response
{
    /**
     * @param  array<string, string>  $headers
     */
    public function __construct(?string $content = '', int $status = 200, array $headers = [])
    {
        parent::__construct($content, $status, new RawHeaderBag($headers));
    }
}
