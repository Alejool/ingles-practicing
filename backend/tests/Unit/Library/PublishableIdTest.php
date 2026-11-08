<?php

namespace Tests\Unit\Library;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Ruta\Library\Domain\PublishableId;
use Ruta\Shared\Domain\DomainError;

/** `idPublicable` de readings.mts: letras, cifras, guion y guion bajo, hasta 64; sin id, uno nuevo. */
final class PublishableIdTest extends TestCase
{
    public function test_valid_ids_pass(): void
    {
        $this->assertSame('mb1x2k3abcd', PublishableId::from('mb1x2k3abcd'));
        $this->assertSame('A-b_9', PublishableId::from('A-b_9'));
        $this->assertSame(str_repeat('x', 64), PublishableId::from(str_repeat('x', 64)));
    }

    /** @return array<string, array{mixed}> */
    public static function invalid(): array
    {
        return [
            'html' => ['"><img src=x onerror=alert(1)>'], 'tag' => ['<b>'], 'space' => ['a b'], 'dot' => ['a.b'],
            'non ascii' => ['ñ'], 'too long' => [str_repeat('x', 65)], 'number' => [42], 'object' => [new \stdClass],
            'list' => [['abc']], 'trailing newline' => ["a\n"], 'false' => [false],
        ];
    }

    #[DataProvider('invalid')]
    public function test_invalid_ids_are_rejected(mixed $id): void
    {
        try {
            PublishableId::from($id);
            $this->fail('debía rechazar');
        } catch (DomainError $e) {
            $this->assertSame('bad_payload', $e->errorCode);
            $this->assertSame('El identificador del texto no es válido.', $e->getMessage());
        }
    }

    public function test_without_id_a_valid_one_is_generated(): void
    {
        foreach ([null, ''] as $empty) {
            $this->assertMatchesRegularExpression('/^[A-Za-z0-9_-]{1,64}$/D', PublishableId::from($empty));
        }
        $this->assertNotSame(PublishableId::from(null), PublishableId::from(null));
    }
}
