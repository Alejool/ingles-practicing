<?php

namespace Tests\Unit\Auth;

use PHPUnit\Framework\TestCase;
use Ruta\Auth\Infrastructure\LoginEmail;

/**
 * Asunto, texto y HTML idénticos a los de `_mail.mts`.
 *
 * `tests/fixtures/login-email.json` se generó con el código Node real, capturando lo
 * que `sendLoginLink` manda a Resend (desde la raíz del repositorio):
 *   MAIL_PROVIDER=resend MAIL_FROM= node --experimental-strip-types --input-type=module -e '…'
 * (el script sustituye `fetch`, llama a `sendLoginLink` con cada `{link, minutes}` y
 * escribe el JSON; está en specs/backend-separado/progress.md, tarea a.4).
 */
final class LoginEmailTest extends TestCase
{
    public function test_matches_the_node_email_byte_for_byte(): void
    {
        /** @var list<array{link: string, minutes: int, subject: string, text: string, html: string, from: string}> $cases */
        $cases = json_decode((string) file_get_contents(__DIR__.'/../../fixtures/login-email.json'), true, flags: JSON_THROW_ON_ERROR);
        $this->assertNotEmpty($cases);

        foreach ($cases as $case) {
            $email = LoginEmail::compose($case['link'], $case['minutes']);
            $this->assertSame($case['subject'], $email->subject);
            $this->assertSame($case['text'], $email->text);
            $this->assertSame($case['html'], $email->html);
        }
    }

    public function test_default_sender_matches_node(): void
    {
        /** @var list<array{from: string}> $cases */
        $cases = json_decode((string) file_get_contents(__DIR__.'/../../fixtures/login-email.json'), true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame($cases[0]['from'], LoginEmail::DEFAULT_FROM);
    }
}
