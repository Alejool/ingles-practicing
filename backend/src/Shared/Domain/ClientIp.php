<?php

namespace Ruta\Shared\Domain;

/**
 * IP del cliente detrás de `$hops` proxies propios (TRUST_PROXY), como `ipDeProxy`.
 *
 * Cada proxy añade al final de `X-Forwarded-For` la IP que vio de verdad, así que la
 * del cliente es la que queda tras descontar esos saltos desde la derecha. Lo que haya
 * más a la izquierda lo pudo escribir el cliente y no cuenta.
 */
final class ClientIp
{
    public static function fromProxy(string $remote, string $forwarded, int $hops): string
    {
        $socket = self::clean($remote);
        if ($socket === '') {
            $socket = '0.0.0.0';
        }
        if ($hops <= 0) {
            return $socket;
        }

        $chain = array_values(array_filter(
            array_map(self::clean(...), explode(',', $forwarded)),
            fn (string $ip) => $ip !== '',
        ));
        $chain[] = $socket;

        return $chain[max(0, count($chain) - 1 - $hops)];
    }

    private static function clean(string $ip): string
    {
        return (string) preg_replace('/^::ffff:/', '', trim($ip));
    }
}
