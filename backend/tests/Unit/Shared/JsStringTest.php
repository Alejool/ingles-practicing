<?php

namespace Tests\Unit\Shared;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Ruta\Shared\Domain\JsString;

/** `String(x || "")`, `trim()` y `.length` de JS sobre lo que puede traer un JSON. */
final class JsStringTest extends TestCase
{
    /** @return array<string, array{mixed, string}> */
    public static function values(): array
    {
        $obj = new \stdClass;
        $obj->a = 1;

        return [
            'null' => [null, ''],
            'false' => [false, ''],
            'true' => [true, 'true'],
            'zero' => [0, ''],
            'zero float' => [0.0, ''],
            'int' => [42, '42'],
            'float' => [1.5, '1.5'],
            'whole float' => [3.0, '3'],
            'string' => ['abc', 'abc'],
            'list' => [['a', 1, null], 'a,1,'],
            'object' => [$obj, '[object Object]'],
        ];
    }

    #[DataProvider('values')]
    public function test_falsy_or_string(mixed $value, string $expected): void
    {
        $this->assertSame($expected, JsString::orEmpty($value));
    }

    public function test_trim_removes_unicode_whitespace_like_js(): void
    {
        $this->assertSame('a b', JsString::trim("\u{00A0}\u{FEFF}\t a b \u{2003}\n"));
    }

    public function test_length_counts_utf16_units(): void
    {
        $this->assertSame(0, JsString::length(''));
        $this->assertSame(1, JsString::length('á'));
        $this->assertSame(2, JsString::length('😀'));
    }
}
