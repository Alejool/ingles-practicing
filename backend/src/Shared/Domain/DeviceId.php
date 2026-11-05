<?php

namespace Ruta\Shared\Domain;

/**
 * Identificador del dispositivo, como `deviceId` de _http.mts: la cabecera
 * X-Device-Id o, si no viene, `device_id` del cuerpo; vale si tiene 8–64 caracteres
 * de [A-Za-z0-9_-] y si no, cadena vacía.
 */
final class DeviceId
{
    public static function from(?string $header, mixed $bodyValue): string
    {
        // `header || body?.device_id || ""`: una cabecera no vacía gana aunque solo tenga espacios.
        $raw = $header !== null && $header !== '' ? $header : self::jsString($bodyValue);
        $raw = trim($raw);

        return preg_match('/^[A-Za-z0-9_-]{8,64}$/', $raw) === 1 ? $raw : '';
    }

    /** `String(x)` de JS para lo que puede traer un JSON; los valores falsos dan "". */
    private static function jsString(mixed $v): string
    {
        return match (true) {
            $v === null, $v === false, $v === '', $v === 0, $v === 0.0 => '',
            $v === true => 'true',
            is_string($v) => $v,
            is_int($v) => (string) $v,
            is_float($v) => floor($v) === $v && abs($v) < 1e21 ? sprintf('%.0f', $v) : (string) $v,
            is_array($v) => implode(',', array_map(self::jsString(...), $v)),
            default => '[object Object]',
        };
    }
}
