<?php

namespace Tests\Support;

use Ruta\Auth\Domain\Delivery;
use Ruta\Auth\Domain\LoginLinkSender;
use RuntimeException;

/** Adaptador de prueba del puerto de correo: guarda cada enlace o falla a petición. */
final class RecordingLinkSender implements LoginLinkSender
{
    /** @var list<array{to: string, link: string, minutes: int}> */
    public array $sent = [];

    public bool $fail = false;

    public function send(string $to, string $link, int $minutes): void
    {
        if ($this->fail) {
            throw new RuntimeException('smtp caído');
        }
        $this->sent[] = ['to' => $to, 'link' => $link, 'minutes' => $minutes];
    }

    public function delivery(): Delivery
    {
        return Delivery::mailbox('http://buzon.test');
    }

    /** El token del último enlace enviado. */
    public function lastToken(): string
    {
        $last = end($this->sent);
        if ($last === false || preg_match('/[?&]token=([^&]+)/', $last['link'], $m) !== 1) {
            throw new RuntimeException('no se envió ningún enlace');
        }

        return rawurldecode($m[1]);
    }
}
