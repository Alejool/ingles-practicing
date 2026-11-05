<?php

namespace Tests\Unit\Http;

use App\Http\Support\HttpError;
use App\Http\Support\JsonBody;
use PHPUnit\Framework\TestCase;
use stdClass;

/** Igual que `readJson` de netlify/functions/_http.mts. */
final class JsonBodyTest extends TestCase
{
    public function test_empty_body_is_an_empty_object(): void
    {
        $this->assertEquals(new stdClass, JsonBody::parse(''));
        $this->assertSame('{}', json_encode(JsonBody::parse('')));
    }

    public function test_literal_null_is_valid(): void
    {
        $this->assertNull(JsonBody::parse('null'));
    }

    public function test_invalid_json_is_bad_json_400(): void
    {
        foreach (['{', '{"a":}', '   ', "{'a':1}", 'undefined'] as $raw) {
            $e = $this->catchError(fn () => JsonBody::parse($raw));
            $this->assertSame('bad_json', $e->errorCode, $raw);
            $this->assertSame('JSON inválido.', $e->getMessage());
            $this->assertSame(400, $e->status);
        }
    }

    public function test_empty_objects_and_arrays_are_kept(): void
    {
        $parsed = JsonBody::parse('{"a":{},"b":[],"c":0.0,"d":"á/é","e":{"f":{}}}');

        $this->assertSame(
            '{"a":{},"b":[],"c":0.0,"d":"á/é","e":{"f":{}}}',
            json_encode($parsed, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION),
        );
    }

    public function test_limit_counts_utf16_units_not_bytes(): void
    {
        // "á" = 2 bytes, 1 unidad; "😀" = 4 bytes, 2 unidades (par suplente).
        $this->assertSame(1, JsonBody::units('á'));
        $this->assertSame(2, JsonBody::units('😀'));
        $this->assertSame(0, JsonBody::units(''));

        $raw = '"'.str_repeat('á', 8).'😀"';             // 2 + 8 + 2 = 12 unidades, 22 bytes
        $this->assertSame(12, JsonBody::units($raw));
        $this->assertSame('ááááááááá😀', JsonBody::parse('"ááááááááá😀"', 13));
        $this->assertSame(str_repeat('á', 8).'😀', JsonBody::parse($raw, 12));

        $e = $this->catchError(fn () => JsonBody::parse($raw, 11));
        $this->assertSame('payload_too_large', $e->errorCode);
        $this->assertSame('El texto enviado es demasiado largo.', $e->getMessage());
        $this->assertSame(413, $e->status);
    }

    public function test_size_is_checked_before_syntax(): void
    {
        $e = $this->catchError(fn () => JsonBody::parse('{{{{{', 3));
        $this->assertSame('payload_too_large', $e->errorCode);
    }

    public function test_default_limit_is_96_kib(): void
    {
        $ok = '"'.str_repeat('a', 96 * 1024 - 2).'"';
        $this->assertSame(96 * 1024 - 2, strlen((string) JsonBody::parse($ok)));

        $e = $this->catchError(fn () => JsonBody::parse('"'.str_repeat('a', 96 * 1024 - 1).'"'));
        $this->assertSame('payload_too_large', $e->errorCode);
    }

    private function catchError(callable $fn): HttpError
    {
        try {
            $fn();
        } catch (HttpError $e) {
            return $e;
        }
        $this->fail('Se esperaba un HttpError');
    }
}
