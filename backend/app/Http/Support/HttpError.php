<?php

namespace App\Http\Support;

use Ruta\Shared\Domain\DomainError;

/**
 * Error que nace en el borde HTTP (cuerpo ilegible o demasiado grande, método no
 * permitido) y por eso ya sabe su estado.
 */
final class HttpError extends DomainError
{
    /**
     * @param  array<string, mixed>  $extra
     */
    public function __construct(
        public readonly int $status,
        string $errorCode,
        string $message = '',
        array $extra = [],
    ) {
        parent::__construct($errorCode, $message, $extra);
    }
}
