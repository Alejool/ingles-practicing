<?php

namespace Ruta\Shared\Domain;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;
use InvalidArgumentException;

/**
 * Instante en el formato que devolvía la API Node (`Date#toJSON()`):
 * `2026-11-05T10:00:00.123Z`, siempre UTC y con milisegundos truncados.
 */
final class IsoInstant
{
    private const PG = '/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}(?::?\d{2})?)?$/';

    /** Texto de un `timestamptz` tal como lo da PDO (`2026-11-05 10:00:00.123456+00`). */
    public static function fromPg(string $value): string
    {
        if (preg_match(self::PG, trim($value), $m) !== 1) {
            throw new InvalidArgumentException("Fecha no reconocida: $value");
        }

        $micros = substr(str_pad($m[3] ?? '', 6, '0'), 0, 6);
        $offset = self::offset($m[4] ?? '');
        $dt = DateTimeImmutable::createFromFormat('Y-m-d H:i:s.uP', "{$m[1]} {$m[2]}.{$micros}{$offset}");
        if ($dt === false) {
            throw new InvalidArgumentException("Fecha no reconocida: $value");
        }

        return self::fromDateTime($dt);
    }

    public static function fromDateTime(DateTimeInterface $dt): string
    {
        return DateTimeImmutable::createFromInterface($dt)
            ->setTimezone(new DateTimeZone('UTC'))
            ->format('Y-m-d\TH:i:s.v\Z');
    }

    /** `Z`, `+00`, `-05`, `+0530` o `+05:30` → `+hh:mm`; sin zona, UTC. */
    private static function offset(string $zone): string
    {
        if ($zone === '' || $zone === 'Z') {
            return '+00:00';
        }
        $digits = str_replace(':', '', substr($zone, 1));

        return $zone[0].substr($digits, 0, 2).':'.str_pad(substr($digits, 2, 2), 2, '0');
    }
}
