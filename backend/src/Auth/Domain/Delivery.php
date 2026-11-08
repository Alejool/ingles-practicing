<?php

namespace Ruta\Auth\Domain;

/** `deliveryMode()` de _mail.mts: buzón de desarrollo (con su URL) o correo de verdad. */
final class Delivery
{
    private function __construct(
        public readonly string $mode,
        public readonly ?string $mailboxUrl,
    ) {}

    public static function mailbox(string $url): self
    {
        return new self('mailbox', $url);
    }

    public static function email(): self
    {
        return new self('email', null);
    }
}
