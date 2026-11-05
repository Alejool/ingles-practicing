<?php

namespace Tests\Unit\Shared;

use DateTimeImmutable;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use Ruta\Shared\Domain\IsoInstant;

/**
 * Un `timestamptz` de Postgres como lo devuelve hoy node-pg vía `Date#toJSON()`:
 * UTC, milisegundos (truncados, no redondeados) y `Z`.
 */
final class IsoInstantTest extends TestCase
{
    public function test_utc_with_microseconds_is_truncated_to_milliseconds(): void
    {
        $this->assertSame('2026-11-05T10:00:00.123Z', IsoInstant::fromPg('2026-11-05 10:00:00.123456+00'));
        $this->assertSame('2026-11-05T10:00:00.999Z', IsoInstant::fromPg('2026-11-05 10:00:00.999999+00'));
    }

    public function test_offsets_are_converted_to_utc(): void
    {
        $this->assertSame('2026-11-05T10:00:00.000Z', IsoInstant::fromPg('2026-11-05 05:00:00-05'));
        $this->assertSame('2026-11-05T04:30:00.250Z', IsoInstant::fromPg('2026-11-05 10:00:00.25+05:30'));
        $this->assertSame('2026-11-04T23:59:59.000Z', IsoInstant::fromPg('2026-11-05 00:59:59+01'));
    }

    public function test_short_fractions_and_missing_fraction(): void
    {
        $this->assertSame('2026-11-05T10:00:00.500Z', IsoInstant::fromPg('2026-11-05 10:00:00.5+00'));
        $this->assertSame('2026-11-05T10:00:00.000Z', IsoInstant::fromPg('2026-11-05 10:00:00+00'));
    }

    public function test_iso_input_with_t_and_z_is_accepted(): void
    {
        $this->assertSame('2026-11-05T10:00:00.123Z', IsoInstant::fromPg('2026-11-05T10:00:00.123Z'));
    }

    public function test_from_date_time(): void
    {
        $dt = new DateTimeImmutable('2026-11-05 07:00:00.123987', new \DateTimeZone('America/Bogota'));

        $this->assertSame('2026-11-05T12:00:00.123Z', IsoInstant::fromDateTime($dt));
    }

    public function test_garbage_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        IsoInstant::fromPg('ayer por la tarde');
    }
}
