<?php

namespace Ruta\Shared\Domain;

/**
 * `htmlSeguro` de shared/sanitize.ts: texto plano más `<b>`, `<i>`, `<strong>` y
 * `<em>` sin atributos; lo demás, escapado. Las entidades ya escritas se dejan, así
 * que limpiar dos veces da lo mismo que una. Test dorado contra la salida de TS.
 */
final class HtmlSanitizer
{
    private const ESCAPES = ['&' => '&amp;', '<' => '&lt;', '>' => '&gt;', '"' => '&quot;', "'" => '&#39;'];

    /** Etiqueta permitida desnuda, carácter con significado en HTML, o `&` que no abre una entidad. */
    private const DANGER = '/(<\/?(?:b|i|strong|em)>)|[<>"\']|&(?!(?:[a-z][a-z0-9]{1,31}|#[0-9]{1,7}|#x[0-9a-f]{1,6});)/i';

    public static function clean(mixed $text): string
    {
        if (! is_string($text)) {
            return '';
        }

        return (string) preg_replace_callback(self::DANGER,
            fn (array $m) => isset($m[1]) && $m[1] !== '' ? strtolower($m[1]) : self::ESCAPES[$m[0]],
            $text);
    }
}
