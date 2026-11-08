<?php

namespace Ruta\Ai\Domain;

/** Tipos de petición de IA (`KINDS` e `isKind` de shared/prompts.ts). */
final class AiKind
{
    public const ALL = ['writing', 'speaking', 'tutor', 'error', 'reading', 'test'];

    public static function isKind(mixed $v): bool
    {
        return is_string($v) && in_array($v, self::ALL, true);
    }
}
