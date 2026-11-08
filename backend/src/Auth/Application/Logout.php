<?php

namespace Ruta\Auth\Application;

use Ruta\Auth\Infrastructure\AuthRepository;
use Ruta\Shared\Domain\Hashing;

/** Cierra la sesión del token portador (`revokeSession`). Sin token no hace nada. */
final class Logout
{
    public function __construct(private readonly AuthRepository $repo) {}

    public function handle(?string $bearer): void
    {
        if ($bearer === null || $bearer === '') {
            return;
        }
        $this->repo->deleteSession(Hashing::sha256Hex($bearer));
    }
}
