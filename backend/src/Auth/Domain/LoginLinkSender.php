<?php

namespace Ruta\Auth\Domain;

/**
 * Puerto: envía el enlace mágico. Adaptadores: `MailLoginLinkSender` (log, smtp,
 * resend, postmark) y uno que graba en los tests.
 */
interface LoginLinkSender
{
    /** Lanza si el proveedor no acepta el correo. */
    public function send(string $to, string $link, int $minutes): void;

    /** Dónde llega el correo: el front lo usa para decir dónde buscar el enlace. */
    public function delivery(): Delivery;
}
