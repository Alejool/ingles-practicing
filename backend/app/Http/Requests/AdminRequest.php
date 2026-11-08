<?php

namespace App\Http\Requests;

use Ruta\Shared\Domain\DomainError;

/**
 * `/api/admin`: protegido por ADMIN_TOKEN (`?token=` o bearer; la query manda). Sin
 * la variable el endpoint no existe. `authorize()` lanza los errores de admin.mts.
 */
final class AdminRequest extends ApiRequest
{
    public function authorize(): bool
    {
        $expected = (string) config('ruta.admin_token');
        if ($expected === '') {
            throw new DomainError('not_found', 'No disponible.');
        }
        $query = $this->queryString('token') ?? '';
        $given = $query !== '' ? $query : (string) preg_replace('/^Bearer\s+/i', '', (string) $this->headers->get('Authorization', ''));
        if (! hash_equals($expected, $given)) {
            throw new DomainError('forbidden', 'Token de administración incorrecto.');
        }

        return true;
    }

    /** La operación pedida; solo cuenta en un POST. */
    public function operation(): ?string
    {
        return $this->isMethod('POST') ? $this->queryString('op') : null;
    }

    public function readingId(): string
    {
        return $this->queryString('id') ?? '';
    }

    /** `show` distinto de "1" oculta. */
    public function hides(): bool
    {
        return $this->queryString('show') !== '1';
    }

    public function smokeDevice(): string
    {
        return $this->queryString('dev') ?? '';
    }

    private function queryString(string $name): ?string
    {
        $v = $this->query($name);

        return is_string($v) ? $v : null;
    }
}
