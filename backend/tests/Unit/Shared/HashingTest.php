<?php

namespace Tests\Unit\Shared;

use PHPUnit\Framework\TestCase;
use Ruta\Shared\Domain\Hashing;

/**
 * Los hashes tienen que salir idénticos a los de la API Node: los `ip_hash`,
 * `token_hash` y `anon` ya guardados deben seguir valiendo.
 *
 * tests/fixtures/hashes.json se generó desde la raíz del repo con el código Node real:
 *
 *   node --experimental-strip-types --no-warnings --input-type=module -e '
 *     import { sha256Hex, hashIp } from "./netlify/functions/_http.mts"; …' > backend/tests/fixtures/hashes.json
 *
 * (`hashIp` de _http.mts; `anon` = sha256Hex(dev + "|pulse|" + (IP_PEPPER || "")), la línea 48 de pulse.mts.)
 */
final class HashingTest extends TestCase
{
    /** @var array{sha256Hex: list<array{text: string, hex: string}>, hashIp: list<array{ip: string, pepper: string, hex: string}>, anonPulse: list<array{device: string, pepper: string, hex: string}>} */
    private static array $fixture;

    public static function setUpBeforeClass(): void
    {
        self::$fixture = json_decode((string) file_get_contents(dirname(__DIR__, 2).'/fixtures/hashes.json'), true, flags: JSON_THROW_ON_ERROR);
    }

    public function test_sha256_hex_matches_node(): void
    {
        foreach (self::$fixture['sha256Hex'] as $case) {
            $this->assertSame($case['hex'], Hashing::sha256Hex($case['text']), $case['text']);
        }
    }

    public function test_hash_ip_matches_node_including_the_default_pepper(): void
    {
        $this->assertNotEmpty(self::$fixture['hashIp']);
        foreach (self::$fixture['hashIp'] as $case) {
            $this->assertSame($case['hex'], Hashing::hashIp($case['ip'], $case['pepper']), $case['ip'].' / '.$case['pepper']);
        }
    }

    public function test_anon_pulse_matches_node(): void
    {
        $this->assertNotEmpty(self::$fixture['anonPulse']);
        foreach (self::$fixture['anonPulse'] as $case) {
            $this->assertSame($case['hex'], Hashing::anonPulse($case['device'], $case['pepper']), $case['device'].' / '.$case['pepper']);
        }
    }

    public function test_random_token_is_43_chars_of_base64url(): void
    {
        $seen = [];
        for ($i = 0; $i < 50; $i++) {
            $token = Hashing::randomToken();
            $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]{43}$/', $token);
            $seen[$token] = true;
        }
        $this->assertCount(50, $seen);
    }

    public function test_random_token_length_follows_bytes(): void
    {
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]{22}$/', Hashing::randomToken(16));
    }
}
