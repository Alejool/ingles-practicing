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
        $raw = $header !== null && $header !== '' ? $header : JsString::orEmpty($bodyValue);
        $raw = trim($raw);

        return preg_match('/^[A-Za-z0-9_-]{8,64}$/', $raw) === 1 ? $raw : '';
    }
}
