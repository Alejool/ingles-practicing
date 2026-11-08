<?php

namespace Ruta\Auth\Application;

use Ruta\Auth\Domain\Delivery;

/** Resultado de pedir un enlace: lo que dura y dónde buscarlo. */
final class LoginLinkRequested
{
    public function __construct(
        public readonly int $minutes,
        public readonly Delivery $delivery,
    ) {}
}
