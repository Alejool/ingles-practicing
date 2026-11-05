<?php

namespace Tests\Unit\Shared;

use PHPUnit\Framework\TestCase;
use Ruta\Shared\Domain\Clock;
use Ruta\Shared\Infrastructure\SystemClock;

final class SystemClockTest extends TestCase
{
    public function test_now_is_the_current_instant_in_utc(): void
    {
        $clock = new SystemClock;
        $before = microtime(true);
        $now = $clock->now();
        $after = microtime(true);

        $this->assertInstanceOf(Clock::class, $clock);
        $this->assertSame('UTC', $now->getTimezone()->getName());
        $this->assertGreaterThanOrEqual(floor($before), (float) $now->format('U.u'));
        $this->assertLessThanOrEqual($after, (float) $now->format('U.u'));
    }
}
