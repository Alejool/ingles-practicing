<?php

namespace Ruta\Ai\Application;

use Ruta\Ai\Domain\QuotaPolicy;
use Ruta\Ai\Domain\QuotaState;
use Ruta\Ai\Infrastructure\AiUsageRepository;
use Ruta\Auth\Domain\SessionUser;
use Ruta\Shared\Domain\Clock;
use Throwable;

/**
 * Comprueba la cuota y abre la fila de la llamada sin dejar hueco (`reservar` de _quota.mts).
 *
 * Primero se comprueba sin escribir (lo normal cuando no cabe: un rechazo no deja
 * rastro); si cabe, se escribe la reserva con su coste y se vuelve a comprobar
 * contando ya lo de todos. De dos peticiones simultáneas, la segunda comprobación de
 * al menos una ve las dos filas, así que nunca pasan las dos por un hueco de una.
 * Quien pierde se queda con su fila anulada, que no cobra.
 */
final class ReserveCredits
{
    public function __construct(
        private readonly AiUsageRepository $repo,
        private readonly QuotaPolicy $policy,
        private readonly Clock $clock,
    ) {}

    /**
     * @param  int|null  $credits  créditos a reservar; por defecto, la estimación por tipo y modelo
     */
    public function handle(?SessionUser $user, string $deviceId, string $ipHash, string $kind, string $model, ?int $credits = null): Reservation
    {
        $cost = $credits ?? $this->policy->estimatedCredits($kind, $model);
        $this->check($user, $deviceId, $ipHash, $cost, false);

        $id = $this->repo->insertReservation($user?->id, $deviceId, $ipHash, $kind, $model,
            $cost * $this->policy->limits->creditMicros);

        try {
            return new Reservation($id, $this->check($user, $deviceId, $ipHash, $cost, true));
        } catch (Throwable $e) {
            $this->repo->annul($id);
            throw $e;
        }
    }

    public function annul(string $id): void
    {
        $this->repo->annul($id);
    }

    private function check(?SessionUser $user, string $deviceId, string $ipHash, int $cost, bool $reserved): QuotaState
    {
        $this->policy->assertPace($this->repo->recentCalls($deviceId, $ipHash), $reserved);
        $usage = $this->repo->usage($user, $deviceId, $ipHash, $this->policy->limits);

        return $this->policy->check($usage, $user, $cost, $reserved, $this->clock->now());
    }
}
