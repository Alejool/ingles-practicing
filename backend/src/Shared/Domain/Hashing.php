<?php

namespace Ruta\Shared\Domain;

/**
 * Hashes y tokens con el mismo algoritmo que la API Node: los `ip_hash`, `token_hash`
 * y `anon` ya guardados siguen valiendo.
 */
final class Hashing
{
    /** Pimienta de `hashIp` cuando IP_PEPPER está vacía (la de la API Node). */
    private const DEFAULT_IP_PEPPER = 'ruta-b1b2';

    public static function sha256Hex(string $text): string
    {
        return hash('sha256', $text);
    }

    /** Identifica una IP sin guardarla en claro. */
    public static function hashIp(string $ip, string $pepper): string
    {
        return self::sha256Hex($ip.'|'.($pepper !== '' ? $pepper : self::DEFAULT_IP_PEPPER));
    }

    /** Identificador anónimo del pulso: aquí la pimienta vacía se queda vacía, como en pulse.mts. */
    public static function anonPulse(string $deviceId, string $pepper): string
    {
        return self::sha256Hex($deviceId.'|pulse|'.$pepper);
    }

    /** base64url sin relleno de `$bytes` bytes aleatorios (32 → 43 caracteres). */
    public static function randomToken(int $bytes = 32): string
    {
        return rtrim(strtr(base64_encode(random_bytes($bytes)), '+/', '-_'), '=');
    }
}
