<?php

namespace Ruta\Pulse\Infrastructure;

use Illuminate\Database\ConnectionInterface;
use Ruta\Pulse\Domain\Beat;

/** SQL de pulse.mts, tal cual: una fila por dispositivo anónimo y día. */
final class PulseRepository
{
    public function __construct(private readonly ConnectionInterface $db) {}

    public function upsert(string $anon, Beat $beat): void
    {
        $this->db->insert(
            'insert into pulse (anon, day, track, plan_day, done_days, streak, seen)
             values (?, current_date, ?, ?, ?, ?, ?)
             on conflict (anon, day) do update set
               track = excluded.track,
               plan_day = greatest(pulse.plan_day, excluded.plan_day),
               done_days = greatest(pulse.done_days, excluded.done_days),
               streak = greatest(pulse.streak, excluded.streak),
               seen = excluded.seen,
               updated_at = now()',
            [$anon, $beat->track, $beat->planDay, $beat->doneDays, $beat->streak, $beat->seen]);
    }
}
