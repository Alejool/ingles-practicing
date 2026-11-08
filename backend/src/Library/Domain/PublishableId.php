<?php

namespace Ruta\Library\Domain;

use Ruta\Shared\Domain\DomainError;

/**
 * Id de una lectura publicada (`idPublicable` de readings.mts). Lo propone quien
 * publica y acaba en el panel de admin y en las URL del contador: solo con el
 * alfabeto de los que genera la app. Sin id, se genera uno.
 */
final class PublishableId
{
    private const BASE36 = '0123456789abcdefghijklmnopqrstuvwxyz';

    public static function from(mixed $id): string
    {
        if ($id === null || $id === '') {
            return self::generate();
        }
        if (! is_string($id) || preg_match('/^[A-Za-z0-9_-]{1,64}$/D', $id) !== 1) {
            throw new DomainError('bad_payload', 'El identificador del texto no es válido.');
        }

        return $id;
    }

    /** `Date.now().toString(36) + 6 caracteres base 36 al azar`. */
    private static function generate(): string
    {
        $random = '';
        for ($i = 0; $i < 6; $i++) {
            $random .= self::BASE36[random_int(0, 35)];
        }

        return base_convert((string) (int) floor(microtime(true) * 1000), 10, 36).$random;
    }
}
