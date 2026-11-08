<?php

namespace Ruta\Auth\Infrastructure;

/**
 * El correo del enlace mágico, letra por letra el de `_mail.mts`
 * (test dorado: tests/Unit/Auth/LoginEmailTest.php).
 */
final class LoginEmail
{
    public const DEFAULT_FROM = 'Ruta B1→B2 <onboarding@resend.dev>';

    private const SUBJECT = 'Tu acceso a Ruta B1 → B2';

    private const HTML = <<<'HTML'
<!doctype html><html lang="es"><body style="margin:0;background:#EDF0EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#131C1B">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" style="max-width:520px;background:#F8FAF8;border:1px solid #CCD5D2;border-radius:10px" cellpadding="0" cellspacing="0">
      <tr><td style="padding:28px 28px 8px">
        <p style="margin:0 0 4px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6A7977">Ruta B1 → B2</p>
        <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:24px;font-weight:500">Tu acceso</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.55">Pulsa el botón para entrar. El enlace caduca en {{minutes}} minutos y solo funciona una vez.</p>
        <p style="margin:0 0 22px"><a href="{{link}}" style="display:inline-block;background:#0B5D5B;color:#F4FAF9;text-decoration:none;padding:11px 20px;border-radius:6px;font-weight:600;font-size:15px">Entrar en la app</a></p>
        <p style="margin:0 0 6px;font-size:12.5px;color:#6A7977">Si el botón no funciona, copia esta dirección:</p>
        <p style="margin:0 0 22px;font-size:12.5px;word-break:break-all;color:#0B5D5B">{{link}}</p>
        <p style="margin:0;font-size:12.5px;color:#6A7977;border-top:1px solid #CCD5D2;padding-top:14px">Si no pediste este acceso, ignora el correo: sin pulsar el enlace no ocurre nada.</p>
      </td></tr>
    </table>
  </td></tr></table></body></html>
HTML;

    private function __construct(
        public readonly string $subject,
        public readonly string $text,
        public readonly string $html,
    ) {}

    public static function compose(string $link, int $minutes): self
    {
        $text = "Entra con este enlace:\n\n{$link}\n\n"
            ."Caduca en {$minutes} minutos y solo funciona una vez.\n"
            .'Si no lo pediste tú, ignora este correo.';

        return new self(self::SUBJECT, $text, strtr(self::HTML, ['{{link}}' => $link, '{{minutes}}' => (string) $minutes]));
    }
}
