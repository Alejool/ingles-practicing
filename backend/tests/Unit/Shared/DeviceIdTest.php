<?php

namespace Tests\Unit\Shared;

use PHPUnit\Framework\TestCase;
use Ruta\Shared\Domain\DeviceId;

/** `deviceId` de _http.mts: cabecera X-Device-Id o `device_id` del cuerpo, 8–64 de [A-Za-z0-9_-]. */
final class DeviceIdTest extends TestCase
{
    public function test_header_is_used_when_valid(): void
    {
        $this->assertSame('dev-1234_abcd', DeviceId::from('dev-1234_abcd', null));
        $this->assertSame('dev-1234_abcd', DeviceId::from('  dev-1234_abcd  ', 'otro-dispositivo'));
    }

    public function test_body_is_used_when_header_is_missing_or_empty(): void
    {
        $this->assertSame('cuerpo-12345', DeviceId::from(null, 'cuerpo-12345'));
        $this->assertSame('cuerpo-12345', DeviceId::from('', 'cuerpo-12345'));
    }

    public function test_a_whitespace_header_does_not_fall_back_to_the_body(): void
    {
        // En JS "   " es verdadero: se usa, se recorta a "" y no vale.
        $this->assertSame('', DeviceId::from('   ', 'cuerpo-12345'));
    }

    public function test_invalid_values_give_empty_string(): void
    {
        $this->assertSame('', DeviceId::from('corto', null));
        $this->assertSame('', DeviceId::from(str_repeat('a', 65), null));
        $this->assertSame('', DeviceId::from('con espacio 123', null));
        $this->assertSame('', DeviceId::from('acentó-12345', null));
        $this->assertSame('', DeviceId::from(null, null));
        $this->assertSame('', DeviceId::from(null, ''));
        $this->assertSame('', DeviceId::from(null, false));
        $this->assertSame('', DeviceId::from(null, 0));
        $this->assertSame('', DeviceId::from(null, new \stdClass));
        $this->assertSame(str_repeat('a', 64), DeviceId::from(str_repeat('a', 64), null));
        $this->assertSame('abcdefgh', DeviceId::from('abcdefgh', null));
    }

    public function test_body_values_are_stringified_like_javascript(): void
    {
        $this->assertSame('12345678', DeviceId::from(null, 12345678));
        $this->assertSame('12345678', DeviceId::from(null, 12345678.0));
        $this->assertSame('abcdefghij', DeviceId::from(null, ['abcdefghij']));
        $this->assertSame('', DeviceId::from(null, ['abcdefghij', 'klmnopqrst']));
        $this->assertSame('', DeviceId::from(null, true));
    }
}
