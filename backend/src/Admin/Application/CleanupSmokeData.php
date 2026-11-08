<?php

namespace Ruta\Admin\Application;

use Ruta\Admin\Infrastructure\AdminQueries;
use Ruta\Shared\Domain\Hashing;

/**
 * `op=cleanup-test`: borra lo que dejan las pruebas de humo. El latido no guarda el
 * id de dispositivo, solo su hash: para borrar el de la prueba se recalcula con la
 * misma pimienta.
 */
final class CleanupSmokeData
{
    public function __construct(
        private readonly AdminQueries $queries,
        private readonly string $pepper,
    ) {}

    /** @return array{ok: true, borrados: int, pulsos: int, lecturas: int} */
    public function handle(string $smokeDevice): array
    {
        $gone = $this->queries->deleteSmokeData($smokeDevice !== '' ? Hashing::anonPulse($smokeDevice, $this->pepper) : null);

        return ['ok' => true, 'borrados' => $gone['users'], 'pulsos' => $gone['pulses'], 'lecturas' => $gone['readings']];
    }
}
