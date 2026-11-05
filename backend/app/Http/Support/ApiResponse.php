<?php

namespace App\Http\Support;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;

/**
 * Respuesta con `Cache-Control` tal cual se da, o sin él. La de Symfony lo reescribe
 * (ordena directivas, añade `private`, pone `no-cache, private` si falta) y la API
 * Node no: el contrato compara la cadena exacta.
 */
final class ApiResponse extends Response
{
    /**
     * @param  array<string, string>  $headers
     */
    public function __construct(?string $content = '', int $status = 200, array $headers = [])
    {
        parent::__construct($content, $status, new class($headers) extends ResponseHeaderBag
        {
            /** @param  array<string, string>  $headers */
            public function __construct(array $headers = [])
            {
                parent::__construct($headers);

                if ($this->get('Cache-Control') === '') {
                    $this->remove('Cache-Control');
                }
            }

            protected function computeCacheControlValue(): string
            {
                return '';
            }
        });
    }
}
