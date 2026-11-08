<?php

namespace Ruta\Progress\Application;

use Ruta\Auth\Domain\SessionUser;
use Ruta\Progress\Infrastructure\ProgressRepository;
use Ruta\Shared\Domain\DomainError;

/**
 * Sube el progreso con control de concurrencia optimista (progress.mts): quien sube
 * manda la versión que tenía; si en el servidor hay otra, 409 con la copia actual y
 * es el cliente quien funde los dos estados y reintenta.
 */
final class PutProgress
{
    private const CONFLICT = 'Hay una versión más reciente en el servidor.';

    public function __construct(private readonly ProgressRepository $repo) {}

    public function handle(SessionUser $user, PutProgressCommand $cmd): SavedProgress
    {
        $json = json_encode($cmd->data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $base = $cmd->baseVersion;
        $current = $this->repo->version($user->id);

        if ($current === null) {
            $created = $this->repo->insertFirst($user->id, $json);
            if ($created !== null) {
                return new SavedProgress($created['version'], $created['updatedAt']);
            }
        }

        if ($current !== null && (float) $base !== (float) $current) {
            $row = $this->repo->find($user->id);
            throw new DomainError('version_conflict', self::CONFLICT, ['server' => [
                'data' => $row === null ? null : GetProgress::decode($row['data']),
                'version' => $row['version'] ?? 0,
                'updatedAt' => $row['updatedAt'] ?? null,
            ]]);
        }

        $saved = $this->repo->replaceIfVersion($user->id, $json, $base)
            ?? throw new DomainError('version_conflict', self::CONFLICT);

        return new SavedProgress($saved['version'], $saved['updatedAt']);
    }
}
