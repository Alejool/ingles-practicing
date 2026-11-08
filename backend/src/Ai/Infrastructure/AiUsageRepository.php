<?php

namespace Ruta\Ai\Infrastructure;

use Illuminate\Database\ConnectionInterface;
use Ruta\Ai\Domain\QuotaLimits;
use Ruta\Ai\Domain\QuotaUsage;
use Ruta\Auth\Domain\SessionUser;

/**
 * SQL de _quota.mts y ai-chat.mts, tal cual. Cada sentencia se confirma sola (sin
 * transacción): la reserva depende de que las filas de los demás se vean al instante.
 */
final class AiUsageRepository
{
    public function __construct(private readonly ConnectionInterface $db) {}

    /** Llamadas del último minuto de este dispositivo o de esta IP. */
    public function recentCalls(string $deviceId, string $ipHash): int
    {
        return (int) $this->db->scalar(
            "select count(*)::int from ai_usage
              where created_at > now() - interval '60 seconds'
                and ((? <> '' and device_id = ?) or ip_hash = ?)",
            [$deviceId, $deviceId, $ipHash]);
    }

    public function usage(?SessionUser $user, string $deviceId, string $ipHash, QuotaLimits $limits): QuotaUsage
    {
        $spentToday = $this->sum('select coalesce(sum(cost_micros), 0)::bigint from ai_usage where day = current_date and ok');

        if ($user !== null) {
            return new QuotaUsage(
                $spentToday,
                $this->sum('select coalesce(sum(cost_micros), 0)::bigint from ai_usage where user_id = ? and day = current_date and ok', [$user->id]),
                $this->sum("select coalesce(sum(cost_micros), 0)::bigint from ai_usage
                             where user_id = ? and created_at >= date_trunc('month', now()) and ok", [$user->id]),
                0,
                0,
            );
        }

        // Con la ventana diaria solo cuenta lo de hoy; con la de siempre, todo.
        if ($limits->anonDaily()) {
            $byDevice = $deviceId === '' ? 0 : $this->sum(
                'select coalesce(sum(cost_micros), 0)::bigint from ai_usage
                  where device_id = ? and user_id is null and ok and day = current_date', [$deviceId]);
            $byIp = $this->sum(
                'select coalesce(sum(cost_micros), 0)::bigint from ai_usage
                  where ip_hash = ? and user_id is null and ok and day = current_date', [$ipHash]);
        } else {
            $byDevice = $deviceId === '' ? 0 : $this->sum(
                'select coalesce(sum(cost_micros), 0)::bigint from ai_usage
                  where device_id = ? and user_id is null and ok', [$deviceId]);
            $byIp = $this->sum(
                "select coalesce(sum(cost_micros), 0)::bigint from ai_usage
                  where ip_hash = ? and user_id is null and ok
                    and created_at >= now() - (? || ' days')::interval", [$ipHash, (string) $limits->anonIpWindowDays]);
        }

        return new QuotaUsage($spentToday, 0, 0, $byDevice, $byIp);
    }

    public function insertReservation(?string $userId, string $deviceId, string $ipHash, string $kind, string $model, int $micros): string
    {
        return (string) $this->db->scalar(
            'insert into ai_usage (user_id, device_id, ip_hash, kind, model, cost_micros)
             values (?, ?, ?, ?, ?, ?) returning id',
            [$userId, $deviceId !== '' ? $deviceId : null, $ipHash, $kind, $model, $micros]);
    }

    /** Deja una reserva sin cobrar: la llamada no llegó a hacerse o el proveedor la rechazó. */
    public function annul(string $id): void
    {
        $this->db->update('update ai_usage set ok = false where id = ?', [$id]);
    }

    /** Sustituye la reserva por lo que costó de verdad. */
    public function settle(string $id, int $promptTokens, int $completionTokens, int $micros): void
    {
        $this->db->update(
            'update ai_usage set prompt_tokens = ?, completion_tokens = ?, cost_micros = ? where id = ?',
            [$promptTokens, $completionTokens, $micros, $id]);
    }

    /** @param list<string> $bindings */
    private function sum(string $sql, array $bindings = []): int
    {
        return (int) $this->db->scalar($sql, $bindings);
    }
}
