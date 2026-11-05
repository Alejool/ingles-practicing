<?php

namespace Ruta\Shared\Domain;

use DateTimeImmutable;

/** Puerto del reloj: los límites de tiempo se prueban sin dormir (FrozenClock en tests). */
interface Clock
{
    public function now(): DateTimeImmutable;
}
