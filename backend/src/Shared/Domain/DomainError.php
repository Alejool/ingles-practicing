<?php

namespace Ruta\Shared\Domain;

use RuntimeException;

/**
 * Error con un código estable que el front traduce a un mensaje.
 * El dominio no conoce estados HTTP: el adaptador los asigna por código (ErrorMap).
 */
class DomainError extends RuntimeException
{
    /**
     * @param  array<string, mixed>  $extra  campos que acompañan al error en la respuesta
     */
    public function __construct(
        public readonly string $errorCode,
        string $message = '',
        public readonly array $extra = [],
    ) {
        parent::__construct($message !== '' ? $message : $errorCode);
    }
}
