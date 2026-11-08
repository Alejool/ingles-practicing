<?php

namespace Ruta\Auth\Domain;

/**
 * A qué origen se vuelve tras el enlace mágico (`safeReturnTo` de _http.mts).
 *
 * Solo un origen conocido: el de APP_URL, uno de ALLOWED_ORIGINS o, cuando APP_URL
 * ya es local, cualquier puerto de localhost (`astro dev`). Lo demás da null y el
 * enlace vuelve a APP_URL. Sin esta lista blanca sería una redirección abierta.
 */
final class ReturnTo
{
    private const DEFAULT_PORTS = ['http' => 80, 'https' => 443, 'ws' => 80, 'wss' => 443, 'ftp' => 21];

    private const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

    /** @var list<string> */
    private readonly array $allowed;

    public function __construct(private readonly string $appUrl, string $allowedOrigins)
    {
        $this->allowed = array_values(array_filter(
            array_map('trim', explode(',', $allowedOrigins)),
            fn (string $o) => $o !== '',
        ));
    }

    public function from(?string $origin): ?string
    {
        if ($origin === null || $origin === '') {
            return null;
        }
        $candidate = self::parse($origin);
        if ($candidate === null) {
            return null;
        }

        $app = self::parse($this->appUrl);
        if ($app !== null && $candidate['origin'] === $app['origin']) {
            return $candidate['origin'];
        }
        if (in_array($candidate['origin'], $this->allowed, true)) {
            return $candidate['origin'];
        }
        if ($app !== null && self::isLocal($app['host']) && self::isLocal($candidate['host'])) {
            return $candidate['origin'];
        }

        return null;
    }

    /**
     * Origen y host como los da `new URL()`: esquema y host en minúsculas, sin el
     * puerto por defecto. Un esquema sin origen (`mailto:`) o algo que no es una URL: null.
     *
     * @return array{origin: string, host: string}|null
     */
    private static function parse(string $url): ?array
    {
        $parts = parse_url(trim($url));
        if ($parts === false || ! isset($parts['scheme'], $parts['host']) || $parts['host'] === '') {
            return null;
        }
        $scheme = strtolower($parts['scheme']);
        if (! isset(self::DEFAULT_PORTS[$scheme])) {
            return null;
        }
        $host = strtolower($parts['host']);
        $port = isset($parts['port']) && $parts['port'] !== self::DEFAULT_PORTS[$scheme] ? ':'.$parts['port'] : '';

        return ['origin' => "$scheme://$host$port", 'host' => $host];
    }

    private static function isLocal(string $host): bool
    {
        return in_array($host, self::LOCAL_HOSTS, true);
    }
}
