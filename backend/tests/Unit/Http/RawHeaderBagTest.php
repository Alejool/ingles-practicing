<?php

namespace Tests\Unit\Http;

use App\Http\Support\RawHeaderBag;
use PHPUnit\Framework\TestCase;

/**
 * Valores de cabecera como los escribe Node (`http` codifica en Latin-1): «día» sale
 * como `d\xEDa`, que es lo que el front lee. `Cache-Control` tal cual.
 */
final class RawHeaderBagTest extends TestCase
{
    public function test_non_ascii_values_are_written_in_latin1(): void
    {
        $bag = new RawHeaderBag(['X-Quota-Window' => 'día']);
        $this->assertSame("d\xEDa", $bag->get('X-Quota-Window'));

        $bag->set('X-Otra', 'ñandú');
        $this->assertSame("\xF1and\xFA", $bag->get('X-Otra'));
    }

    public function test_ascii_and_already_latin1_values_are_untouched(): void
    {
        $bag = new RawHeaderBag(['X-Quota-Window' => 'total', 'X-Bytes' => "d\xEDa"]);
        $this->assertSame('total', $bag->get('X-Quota-Window'));
        $this->assertSame("d\xEDa", $bag->get('X-Bytes'));
    }

    public function test_cache_control_is_kept_verbatim_or_absent(): void
    {
        $this->assertSame('no-store, no-transform', (new RawHeaderBag(['Cache-Control' => 'no-store, no-transform']))->get('Cache-Control'));
        $this->assertFalse((new RawHeaderBag([]))->has('Cache-Control'));
    }
}
