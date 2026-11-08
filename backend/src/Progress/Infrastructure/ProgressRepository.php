<?php

namespace Ruta\Progress\Infrastructure;

use Illuminate\Database\ConnectionInterface;
use Ruta\Shared\Domain\IsoInstant;

/**
 * SQL de progress.mts, tal cual. `data` entra como texto JSON y sale como el texto
 * de `jsonb` (claves en el orden de Postgres), que el caso de uso decodifica.
 */
final class ProgressRepository
{
    public function __construct(private readonly ConnectionInterface $db) {}

    /** @return array{data: string, version: int, updatedAt: string}|null */
    public function find(string $userId): ?array
    {
        $row = $this->db->selectOne('select data, version, updated_at from progress where user_id = ?', [$userId]);

        return $row === null ? null : ['data' => (string) $row->data, 'version' => (int) $row->version, 'updatedAt' => IsoInstant::fromPg((string) $row->updated_at)];
    }

    public function version(string $userId): ?int
    {
        $v = $this->db->scalar('select version from progress where user_id = ?', [$userId]);

        return $v === null ? null : (int) $v;
    }

    /**
     * Primera copia (versión 1). null si otra petición la creó entretanto.
     *
     * @return array{version: int, updatedAt: string}|null
     */
    public function insertFirst(string $userId, string $json): ?array
    {
        return $this->saved($this->db->selectOne(
            'insert into progress (user_id, data, version) values (?, ?, 1)
             on conflict (user_id) do nothing
             returning version, updated_at', [$userId, $json]));
    }

    /**
     * Sustituye la copia si sigue en la versión `$base`. null si ya no lo estaba.
     *
     * @return array{version: int, updatedAt: string}|null
     */
    public function replaceIfVersion(string $userId, string $json, int|float $base): ?array
    {
        return $this->saved($this->db->selectOne(
            'update progress set data = ?, version = version + 1, updated_at = now()
              where user_id = ? and version = ?
              returning version, updated_at', [$json, $userId, $base]));
    }

    /** @return array{version: int, updatedAt: string}|null */
    private function saved(?object $row): ?array
    {
        return $row === null ? null : ['version' => (int) $row->version, 'updatedAt' => IsoInstant::fromPg((string) $row->updated_at)];
    }
}
