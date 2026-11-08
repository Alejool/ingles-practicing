<?php

namespace Ruta\Library\Application;

use Ruta\Auth\Domain\SessionUser;
use Ruta\Library\Infrastructure\ReadingsRepository;

/**
 * Publica en la biblioteca compartida un texto generado: lo ve todo el mundo y el
 * coste de generarlo se reparte. Publicar pide cuenta (hay a quién atribuirlo).
 */
final class PublishReading
{
    public function __construct(private readonly ReadingsRepository $repo) {}

    public function handle(SessionUser $author, PublishReadingCommand $cmd): string
    {
        $r = $cmd->reading;
        $this->repo->insert($cmd->id, $cmd->track, $cmd->level, $cmd->topic, $r->title, $r->words,
            json_encode($r->data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR), $author->id);

        return $cmd->id;
    }
}
