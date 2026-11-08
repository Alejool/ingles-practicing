<?php

namespace Ruta\Library\Application;

use Ruta\Shared\Domain\JsString;
use Ruta\Library\Infrastructure\ReadingsRepository;

/** Suma una lectura al contador de un texto. Sin cuenta; un id que no existe no hace nada. */
final class CountRead
{
    public function __construct(private readonly ReadingsRepository $repo) {}

    public function handle(string $id): void
    {
        $this->repo->countRead(JsString::clip($id, 64));
    }
}
