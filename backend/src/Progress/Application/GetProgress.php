<?php

namespace Ruta\Progress\Application;

use Ruta\Auth\Domain\SessionUser;
use Ruta\Progress\Infrastructure\ProgressRepository;

/** Descarga el progreso guardado de la cuenta. */
final class GetProgress
{
    public function __construct(private readonly ProgressRepository $repo) {}

    public function handle(SessionUser $user): ProgressSnapshot
    {
        $row = $this->repo->find($user->id);

        return $row === null
            ? new ProgressSnapshot(null, 0, null)
            : new ProgressSnapshot(self::decode($row['data']), $row['version'], $row['updatedAt']);
    }

    /**
     * El texto del `jsonb` como lo daba `JSON.parse`: objetos como `stdClass` (así `{}`
     * sigue siendo un objeto y `[]` una lista al volver a codificarlo) y `0.0` como 0.
     */
    public static function decode(string $json): mixed
    {
        return json_decode($json, false, flags: JSON_THROW_ON_ERROR);
    }
}
