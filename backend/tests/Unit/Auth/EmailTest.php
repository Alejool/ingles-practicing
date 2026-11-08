<?php

namespace Tests\Unit\Auth;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Ruta\Auth\Domain\Email;
use Ruta\Shared\Domain\DomainError;

/** `normaliseEmail` de _auth.mts: recorta, minúsculas, forma básica y como mucho 200 caracteres. */
final class EmailTest extends TestCase
{
    public function test_normalises_case_and_spaces(): void
    {
        $this->assertSame('ana@example.com', Email::fromRaw('  Ana@Example.COM ')->value);
    }

    public function test_accepts_200_characters(): void
    {
        $email = str_repeat('a', 194).'@x.com';
        $this->assertSame(200, strlen($email));
        $this->assertSame($email, Email::fromRaw($email)->value);
    }

    /** @return array<string, array{mixed}> */
    public static function invalid(): array
    {
        return [
            'missing' => [null],
            'empty' => [''],
            'spaces' => ['   '],
            'no at' => ['sin-arroba'],
            'no dot' => ['a@b'],
            'one letter tld' => ['a@b.c'],
            'inner space' => ['a b@c.com'],
            'digit in tld' => ['a@b.c0m'],
            'too long' => [str_repeat('a', 195).'@x.com'],
            'number' => [42],
            'object' => [new \stdClass],
            'two ats' => ['a@b@c.com'],
        ];
    }

    #[DataProvider('invalid')]
    public function test_rejects_with_the_exact_message(mixed $raw): void
    {
        try {
            Email::fromRaw($raw);
            $this->fail('debía lanzar');
        } catch (DomainError $e) {
            $this->assertSame('bad_email', $e->errorCode);
            $this->assertSame('Ese correo no parece válido.', $e->getMessage());
        }
    }
}
