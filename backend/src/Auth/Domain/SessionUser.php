<?php

namespace Ruta\Auth\Domain;

/** Usuario de una sesión válida (`SessionUser` de _auth.mts). */
final class SessionUser
{
    public function __construct(
        public readonly string $id,
        public readonly string $email,
        public readonly int $dailyBonus,
        public readonly bool $blocked,
    ) {}
}
