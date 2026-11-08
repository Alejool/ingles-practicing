<?php

namespace Ruta\Auth\Application;

use Psr\Log\LoggerInterface;
use Ruta\Auth\Domain\LoginLinkSender;
use Ruta\Auth\Domain\ReturnTo;
use Ruta\Auth\Infrastructure\AuthRepository;
use Ruta\Shared\Domain\DomainError;
use Ruta\Shared\Domain\Hashing;
use Throwable;

/**
 * Manda el enlace mágico (auth-request.mts). Responde lo mismo exista o no la
 * cuenta: el endpoint no sirve para averiguar qué correos están registrados.
 */
final class RequestLoginLink
{
    public function __construct(
        private readonly AuthRepository $repo,
        private readonly LoginLinkSender $sender,
        private readonly ReturnTo $returnTo,
        private readonly AuthSettings $settings,
        private readonly LoggerInterface $log,
    ) {}

    /** Sin correo no hay cuentas que crear: mejor decirlo que aceptar el correo y no mandar nada. */
    public function assertAccountsEnabled(): void
    {
        if (! $this->settings->accountsEnabled) {
            throw new DomainError('accounts_off',
                'Esta instalación no usa cuentas: se estudia sin registrarse y el progreso se guarda en tu dispositivo.');
        }
    }

    public function handle(RequestLoginLinkCommand $cmd): LoginLinkRequested
    {
        $email = $cmd->email->value;
        $minutes = $this->settings->linkMinutes;

        if ($this->repo->linksForEmailLastHour($email) >= $this->settings->maxPerEmailHour
            || $this->repo->linksForIpLastHour($cmd->ipHash) >= $this->settings->maxPerIpHour) {
            throw new DomainError('too_many_links', 'Se han pedido demasiados enlaces. Espera una hora.');
        }

        $token = Hashing::randomToken();
        // El origen desde el que se pidió: así en desarrollo se vuelve a :4321.
        $returnTo = $this->returnTo->from($cmd->origin);
        $this->repo->insertLoginToken($email, Hashing::sha256Hex($token), $minutes, $cmd->ipHash, $returnTo);

        $base = rtrim($returnTo ?? $this->settings->appUrl, '/');
        $link = $base.'/api/auth/verify?token='.rawurlencode($token);

        try {
            $this->sender->send($email, $link, $minutes);
        } catch (Throwable $e) {
            $this->log->error('[auth] no se pudo enviar el correo', ['exception' => $e]);
            throw new DomainError('mail_failed', 'No se pudo enviar el correo. Inténtalo en un momento.');
        }

        $this->cleanUp();

        return new LoginLinkRequested($minutes, $this->sender->delivery());
    }

    /** Limpieza barata y oportunista: si falla, la petición sigue (como el `.catch` de Node), pero queda en el log. */
    private function cleanUp(): void
    {
        try {
            $this->repo->deleteStaleLoginTokens();
        } catch (Throwable $e) {
            $this->log->warning('[auth] limpieza de enlaces caducados fallida', ['exception' => $e]);
        }
    }
}
