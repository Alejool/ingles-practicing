<?php

namespace Ruta\Auth\Infrastructure;

use Illuminate\Database\ConnectionInterface;
use Ruta\Auth\Domain\SessionUser;

/** SQL de _auth.mts, auth-request.mts y auth-verify.mts, tal cual. */
final class AuthRepository
{
    public function __construct(private readonly ConnectionInterface $db) {}

    public function linksForEmailLastHour(string $email): int
    {
        return (int) $this->db->scalar(
            "select count(*)::int from login_tokens where email = ? and created_at > now() - interval '1 hour'", [$email]);
    }

    public function linksForIpLastHour(string $ipHash): int
    {
        return (int) $this->db->scalar(
            "select count(*)::int from login_tokens where ip_hash = ? and created_at > now() - interval '1 hour'", [$ipHash]);
    }

    public function insertLoginToken(string $email, string $tokenHash, int $minutes, string $ipHash, ?string $returnTo): void
    {
        $this->db->insert(
            "insert into login_tokens (email, token_hash, expires_at, ip_hash, return_to)
             values (?, ?, now() + (? || ' minutes')::interval, ?, ?)",
            [$email, $tokenHash, (string) $minutes, $ipHash, $returnTo]);
    }

    /** Limpieza oportunista: tokens caducados hace más de un día. */
    public function deleteStaleLoginTokens(): void
    {
        $this->db->delete("delete from login_tokens where expires_at < now() - interval '1 day'");
    }

    /**
     * Consume un enlace vigente en una sola sentencia: dos verificaciones simultáneas del
     * mismo token no pueden abrir dos sesiones. (En Node eran un `select` y un `update`
     * separados; misma respuesta, sin la carrera.) null si no existe, está usado o caducó.
     *
     * @return array{email: string, returnTo: ?string}|null
     */
    public function consumeLoginToken(string $tokenHash): ?array
    {
        $row = $this->db->selectOne(
            'update login_tokens set used_at = now()
              where token_hash = ? and used_at is null and expires_at > now()
              returning email, return_to', [$tokenHash]);

        return $row === null ? null : ['email' => (string) $row->email, 'returnTo' => $row->return_to];
    }

    /** Alta o reencuentro: un correo ya conocido solo actualiza `last_seen_at`. */
    public function upsertUser(string $email): string
    {
        $row = $this->db->selectOne(
            'insert into users (email) values (?)
             on conflict (email) do update set last_seen_at = now()
             returning id', [$email]);

        return (string) $row->id;
    }

    public function insertSession(string $userId, string $tokenHash, int $days, string $userAgent): void
    {
        $this->db->insert(
            "insert into sessions (user_id, token_hash, expires_at, user_agent)
             values (?, ?, now() + (? || ' days')::interval, ?)",
            [$userId, $tokenHash, (string) $days, $userAgent]);
    }

    public function findSessionUser(string $tokenHash): ?SessionUser
    {
        $row = $this->db->selectOne(
            'select u.id, u.email, u.daily_bonus, u.blocked
               from sessions s
               join users u on u.id = s.user_id
              where s.token_hash = ? and s.expires_at > now()
              limit 1', [$tokenHash]);

        return $row === null ? null : new SessionUser((string) $row->id, (string) $row->email, (int) $row->daily_bonus, (bool) $row->blocked);
    }

    public function touchSession(string $tokenHash): void
    {
        $this->db->update('update sessions set last_used_at = now() where token_hash = ?', [$tokenHash]);
    }

    public function touchUser(string $userId): void
    {
        $this->db->update('update users set last_seen_at = now() where id = ?', [$userId]);
    }

    public function deleteSession(string $tokenHash): void
    {
        $this->db->delete('delete from sessions where token_hash = ?', [$tokenHash]);
    }
}
