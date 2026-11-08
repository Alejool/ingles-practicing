<?php

namespace Tests\Unit\Auth;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Ruta\Auth\Domain\ReturnTo;

/** `safeReturnTo` de _http.mts: solo orígenes conocidos; el resto, null. */
final class ReturnToTest extends TestCase
{
    /** @return array<string, array{string, string, ?string, ?string}> */
    public static function cases(): array
    {
        $app = 'http://localhost:8080';
        $allowed = 'https://permitido.example, https://otro.example';

        return [
            'no origin' => [$app, $allowed, null, null],
            'empty origin' => [$app, $allowed, '', null],
            'app url' => [$app, $allowed, 'http://localhost:8080', 'http://localhost:8080'],
            'allowed' => [$app, $allowed, 'https://permitido.example', 'https://permitido.example'],
            'allowed second' => [$app, $allowed, 'https://otro.example', 'https://otro.example'],
            'allowed with path' => [$app, $allowed, 'https://permitido.example/ruta?x=1', 'https://permitido.example'],
            'host is lowercased' => [$app, $allowed, 'HTTPS://PERMITIDO.example', 'https://permitido.example'],
            'default port dropped' => [$app, $allowed, 'https://permitido.example:443', 'https://permitido.example'],
            'localhost dev' => [$app, $allowed, 'http://localhost:4321', 'http://localhost:4321'],
            '127.0.0.1 dev' => [$app, $allowed, 'http://127.0.0.1:3000', 'http://127.0.0.1:3000'],
            'ipv6 dev' => [$app, $allowed, 'http://[::1]:4321', 'http://[::1]:4321'],
            'foreign' => [$app, $allowed, 'https://ajeno.example', null],
            'null text' => [$app, $allowed, 'null', null],
            'garbage' => [$app, $allowed, 'basura', null],
            'non-http scheme' => [$app, $allowed, 'mailto:a@b.com', null],
            'localhost with public app url' => ['https://ruta.example', $allowed, 'http://localhost:4321', null],
            'app url origin with path' => ['https://ruta.example/app/', '', 'https://ruta.example', 'https://ruta.example'],
            'no app url, allowed' => ['', $allowed, 'https://permitido.example', 'https://permitido.example'],
            'no app url, localhost' => ['', '', 'http://localhost:4321', null],
            'star is not an origin' => [$app, '*', 'https://ajeno.example', null],
        ];
    }

    #[DataProvider('cases')]
    public function test_safe_return_to(string $appUrl, string $allowed, ?string $origin, ?string $expected): void
    {
        $this->assertSame($expected, (new ReturnTo($appUrl, $allowed))->from($origin));
    }
}
