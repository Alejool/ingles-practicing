<?php

namespace Ruta\Ai\Application;

use Ruta\Ai\Domain\QuotaState;

/** Una reserva abierta en `ai_usage` y la cuota tal como quedó al hacerla. */
final class Reservation
{
    public function __construct(
        public readonly string $id,
        public readonly QuotaState $state,
    ) {}
}
