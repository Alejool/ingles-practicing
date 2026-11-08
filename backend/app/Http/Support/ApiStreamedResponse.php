<?php

namespace App\Http\Support;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Respuesta en streaming con las cabeceras tal cual (ver RawHeaderBag). El constructor
 * de StreamedResponse solo acepta un array de cabeceras, así que se construye como
 * Response con la bolsa propia y después se pone el callback.
 */
final class ApiStreamedResponse extends StreamedResponse
{
    /**
     * @param  array<string, string>  $headers
     */
    public function __construct(callable $callback, int $status, array $headers)
    {
        Response::__construct(null, $status, new RawHeaderBag($headers));
        $this->setCallback($callback);
        // setContent(null), que llama el constructor de Response, lo marca como ya enviado;
        // StreamedResponse::__construct lo desmarca después, y aquí igual.
        $this->streamed = false;
    }
}
