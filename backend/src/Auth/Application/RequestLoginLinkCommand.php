<?php

namespace Ruta\Auth\Application;

use Ruta\Auth\Domain\Email;

/** Petición de enlace mágico ya validada en el borde. */
final class RequestLoginLinkCommand
{
    public function __construct(
        public readonly Email $email,
        public readonly string $ipHash,
        public readonly ?string $origin,
    ) {}
}
