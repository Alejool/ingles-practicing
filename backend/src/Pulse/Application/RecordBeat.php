<?php

namespace Ruta\Pulse\Application;

use Ruta\Pulse\Infrastructure\PulseRepository;
use Ruta\Shared\Domain\Hashing;

/**
 * Guarda el latido de un dispositivo. El identificador es un hash con pimienta del
 * id de dispositivo: sirve para contar personas distintas y para nada más. Mandar
 * el latido de más no infla nada (una fila por dispositivo y día, con `greatest`).
 * Sin dispositivo no se guarda nada.
 */
final class RecordBeat
{
    public function __construct(
        private readonly PulseRepository $repo,
        private readonly string $pepper,
    ) {}

    public function handle(RecordBeatCommand $cmd): void
    {
        if ($cmd->deviceId === '') {
            return;
        }
        $this->repo->upsert(Hashing::anonPulse($cmd->deviceId, $this->pepper), $cmd->beat);
    }
}
