<?php

namespace Ruta\Auth\Application;

use Psr\Log\LoggerInterface;
use Ruta\Auth\Domain\SessionUser;
use Ruta\Auth\Infrastructure\AuthRepository;
use Ruta\Shared\Domain\DomainError;
use Ruta\Shared\Domain\Hashing;
use Throwable;

/** Usuario del token portador (`currentUser` y `requireUser` de _auth.mts). */
final class ResolveSession
{
    public function __construct(
        private readonly AuthRepository $repo,
        private readonly LoggerInterface $log,
    ) {}

    /** null si no hay token o no corresponde a una sesión vigente. */
    public function handle(?string $bearer): ?SessionUser
    {
        if ($bearer === null || $bearer === '') {
            return null;
        }
        $hash = Hashing::sha256Hex($bearer);
        $user = $this->repo->findSessionUser($hash);
        if ($user === null) {
            return null;
        }
        if ($user->blocked) {
            throw new DomainError('account_blocked', 'Esta cuenta está bloqueada.');
        }
        $this->touch($hash, $user->id);

        return $user;
    }

    public function require(?string $bearer): SessionUser
    {
        return $this->handle($bearer)
            ?? throw new DomainError('not_authenticated', 'Inicia sesión para continuar.');
    }

    /** Marca de uso: si falla, la petición sigue (en Node ni se espera), pero queda en el log. */
    private function touch(string $hash, string $userId): void
    {
        try {
            $this->repo->touchSession($hash);
            $this->repo->touchUser($userId);
        } catch (Throwable $e) {
            $this->log->warning('[auth] no se pudo marcar el uso de la sesión', ['exception' => $e]);
        }
    }
}
