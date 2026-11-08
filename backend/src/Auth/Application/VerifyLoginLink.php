<?php

namespace Ruta\Auth\Application;

use Psr\Log\LoggerInterface;
use Ruta\Auth\Infrastructure\AuthRepository;
use Ruta\Shared\Domain\Hashing;
use Throwable;

/**
 * Consume el enlace mágico y da la dirección a la que volver (auth-verify.mts):
 * `<base>/#auth=error`, `#auth=expired` o `#auth=<token de sesión>`. El token viaja
 * en el fragmento, que no llega al servidor ni queda en los logs del proxy.
 */
final class VerifyLoginLink
{
    private const USER_AGENT_MAX = 300;

    public function __construct(
        private readonly AuthRepository $repo,
        private readonly AuthSettings $settings,
        private readonly LoggerInterface $log,
    ) {}

    public function handle(string $token, ?string $userAgent): string
    {
        try {
            if ($token === '') {
                return $this->back('auth=error');
            }

            $link = $this->repo->consumeLoginToken(Hashing::sha256Hex($token));
            if ($link === null) {
                return $this->back('auth=expired');
            }

            $userId = $this->repo->upsertUser($link['email']);

            $session = Hashing::randomToken();
            $this->repo->insertSession($userId, Hashing::sha256Hex($session), $this->settings->sessionDays,
                mb_substr($userAgent ?? '', 0, self::USER_AGENT_MAX));

            return $this->back('auth='.rawurlencode($session), $link['returnTo']);
        } catch (Throwable $e) {
            // Siempre redirige: la app enseña "no se pudo entrar" en vez de una página de error.
            $this->log->error('[auth] verify', ['exception' => $e]);

            return $this->back('auth=error');
        }
    }

    private function back(string $fragment, ?string $returnTo = null): string
    {
        $base = $returnTo !== null && $returnTo !== '' ? $returnTo : ($this->settings->appUrl !== '' ? $this->settings->appUrl : '/');

        return rtrim($base, '/')."/#$fragment";
    }
}
