<?php

namespace Ruta\Shared\Infrastructure;

use RuntimeException;
use Ruta\Shared\Domain\Tracks;

/**
 * Lee las rutas de `tracks.json`, el índice que exporta `npm run content:export`
 * (y el build de Docker). Si falta, falla con un mensaje claro: mejor que servir
 * rutas vacías y tratar todo como `b1b2` sin decirlo.
 */
final class ContentTracks
{
    public static function load(string $contentDir): Tracks
    {
        $file = rtrim($contentDir, '/').'/tracks.json';
        if (! is_file($file)) {
            throw new RuntimeException("Falta el índice de contenido ($file): ejecuta `npm run content:export`.");
        }
        /** @var list<array{id: string}> $tracks */
        $tracks = json_decode((string) file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);

        return new Tracks(array_map(fn (array $t) => (string) $t['id'], $tracks));
    }
}
