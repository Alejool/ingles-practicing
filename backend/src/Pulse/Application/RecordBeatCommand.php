<?php

namespace Ruta\Pulse\Application;

use Ruta\Pulse\Domain\Beat;

/** Latido leído del cuerpo; `deviceId` vacío si no vino uno válido. */
final class RecordBeatCommand
{
    public function __construct(
        public readonly string $deviceId,
        public readonly Beat $beat,
    ) {}
}
