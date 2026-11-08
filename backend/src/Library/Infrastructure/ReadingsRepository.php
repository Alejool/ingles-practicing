<?php

namespace Ruta\Library\Infrastructure;

use Illuminate\Database\ConnectionInterface;
use Ruta\Shared\Domain\IsoInstant;

/** SQL de readings.mts, tal cual. */
final class ReadingsRepository
{
    private const COLUMNS = 'id, created_at, track, level, topic, title, words, data, reads';

    public function __construct(private readonly ConnectionInterface $db) {}

    /**
     * Lo visible de una ruta, de lo más nuevo a lo más viejo; con `$after`, solo lo
     * posterior (un `$after` que no es una fecha hace fallar la consulta, como en Node).
     *
     * @return list<array<string, mixed>>
     */
    public function visible(string $track, ?string $after, int $limit): array
    {
        $rows = $after !== null
            ? $this->db->select(
                'select '.self::COLUMNS.' from shared_readings
                  where track = ? and not hidden and created_at > ?::timestamptz
                  order by created_at desc limit ?', [$track, $after, $limit])
            : $this->db->select(
                'select '.self::COLUMNS.' from shared_readings
                  where track = ? and not hidden
                  order by created_at desc limit ?', [$track, $limit]);

        return array_map(fn (object $r) => [
            'id' => (string) $r->id,
            'created_at' => IsoInstant::fromPg((string) $r->created_at),
            'track' => (string) $r->track,
            'level' => (string) $r->level,
            'topic' => (string) $r->topic,
            'title' => (string) $r->title,
            'words' => (int) $r->words,
            'data' => json_decode((string) $r->data, false, flags: JSON_THROW_ON_ERROR),
            'reads' => (int) $r->reads,
        ], $rows);
    }

    public function countRead(string $id): void
    {
        $this->db->update('update shared_readings set reads = reads + 1 where id = ?', [$id]);
    }

    /** Un id que ya existe no se sobrescribe. */
    public function insert(string $id, string $track, string $level, string $topic, string $title, int $words, string $dataJson, string $authorId): void
    {
        $this->db->insert(
            'insert into shared_readings (id, track, level, topic, title, words, data, author_id)
             values (?, ?, ?, ?, ?, ?, ?, ?)
             on conflict (id) do nothing',
            [$id, $track, $level, $topic, $title, $words, $dataJson, $authorId]);
    }
}
