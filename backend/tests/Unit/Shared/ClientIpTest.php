<?php

namespace Tests\Unit\Shared;

use PHPUnit\Framework\TestCase;
use Ruta\Shared\Domain\ClientIp;

/** Los casos de `ipDeProxy` en tests/client-ip.test.mts. */
final class ClientIpTest extends TestCase
{
    public function test_without_trusted_proxy_the_socket_wins(): void
    {
        $this->assertSame('192.0.2.10', ClientIp::fromProxy('192.0.2.10', '9.9.9.9', 0));
        $this->assertSame('192.0.2.10', ClientIp::fromProxy('::ffff:192.0.2.10', '9.9.9.9, 8.8.8.8', 0));
        $this->assertSame('0.0.0.0', ClientIp::fromProxy('', '9.9.9.9', 0));
    }

    public function test_with_one_trusted_proxy_the_last_hop_wins(): void
    {
        $this->assertSame('203.0.113.7', ClientIp::fromProxy('10.0.0.2', '9.9.9.9, 203.0.113.7', 1));
        $this->assertSame('203.0.113.7', ClientIp::fromProxy('10.0.0.2', '203.0.113.7', 1));
        $this->assertSame('203.0.113.7', ClientIp::fromProxy('10.0.0.2', ' 9.9.9.9 ,, ::ffff:203.0.113.7 ', 1));
    }

    public function test_with_one_trusted_proxy_and_no_header_the_socket_wins(): void
    {
        $this->assertSame('10.0.0.2', ClientIp::fromProxy('10.0.0.2', '', 1));
    }

    public function test_with_two_trusted_proxies_two_hops_are_skipped(): void
    {
        $this->assertSame('203.0.113.7', ClientIp::fromProxy('10.0.0.2', '9.9.9.9, 203.0.113.7, 172.16.0.5', 2));
        $this->assertSame('203.0.113.7', ClientIp::fromProxy('10.0.0.2', '203.0.113.7', 3));
    }

    /**
     * Paridad con `ipDeProxy`: con más saltos de confianza que IPs en la cadena gana la
     * de más a la izquierda (la pudo escribir el cliente). Es un error de configuración
     * de TRUST_PROXY, no un caso normal; se fija tal cual hasta que cambie Node.
     */
    public function test_more_hops_than_chain_falls_back_to_the_leftmost_entry(): void
    {
        $this->assertSame('9.9.9.9', ClientIp::fromProxy('10.0.0.2', '9.9.9.9, 203.0.113.7', 5));
        $this->assertSame('10.0.0.2', ClientIp::fromProxy('10.0.0.2', '', 4));
    }

    public function test_negative_hops_behave_like_zero(): void
    {
        $this->assertSame('10.0.0.2', ClientIp::fromProxy('10.0.0.2', '9.9.9.9', -1));
    }
}
