<?php

namespace Ruta\Auth\Domain;

use Ruta\Shared\Domain\DomainError;
use Ruta\Shared\Domain\JsString;

/** Correo normalizado como `normaliseEmail` de _auth.mts (recortado, en minúsculas, ≤ 200). */
final class Email
{
    private function __construct(public readonly string $value) {}

    public static function fromRaw(mixed $raw): self
    {
        $email = mb_strtolower(JsString::trim(JsString::orEmpty($raw)), 'UTF-8');
        // `[^\s@]` de JS: `\s` incluye los espacios Unicode y el BOM.
        $shape = preg_match('/^[^\s\p{Z}\x{FEFF}@]+@[^\s\p{Z}\x{FEFF}@]+\.[a-z]{2,}$/iu', $email) === 1;
        if (! $shape || JsString::length($email) > 200) {
            throw new DomainError('bad_email', 'Ese correo no parece válido.');
        }

        return new self($email);
    }
}
