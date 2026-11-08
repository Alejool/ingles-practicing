<?php

namespace Ruta\Admin\Application;

use Ruta\Admin\Infrastructure\AdminQueries;
use Ruta\Shared\Domain\DomainError;
use Ruta\Shared\Domain\JsString;

/** Moderación de la biblioteca: ocultar (o volver a mostrar) un texto sin entrar a la base. */
final class HideReading
{
    public function __construct(private readonly AdminQueries $queries) {}

    /** @return object `{id, title, hidden}` del texto */
    public function handle(string $rawId, bool $hidden): object
    {
        // `(id || "").trim().slice(0, 64)`: el id de la biblioteca es texto, no un número.
        $id = JsString::slice(JsString::trim($rawId), 64);
        if ($id === '') {
            throw new DomainError('bad_id', 'Falta el id del texto.');
        }

        return $this->queries->setHidden($id, $hidden)
            ?? throw new DomainError('not_found', 'No hay ningún texto con ese id.');
    }
}
