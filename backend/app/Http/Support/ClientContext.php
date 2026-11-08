<?php

namespace App\Http\Support;

use Illuminate\Http\Request;
use Ruta\Shared\Domain\ClientIp;
use Ruta\Shared\Domain\DeviceId;
use Ruta\Shared\Domain\Hashing;

/** Quién llama: IP (con hash), dispositivo y token portador, leídos como en _http.mts y _auth.mts. */
final class ClientContext
{
    /** `hashIp(clientIp(req))`: la IP sale del socket y de TRUST_PROXY, nunca solo de una cabecera. */
    public static function ipHash(Request $request): string
    {
        $ip = ClientIp::fromProxy(
            (string) $request->server('REMOTE_ADDR', ''),
            (string) $request->headers->get('X-Forwarded-For', ''),
            (int) config('ruta.trust_proxy'),
        );

        return Hashing::hashIp($ip, (string) config('ruta.ip_pepper'));
    }

    /** `deviceId(req, body)`: cabecera X-Device-Id o `device_id` del cuerpo. */
    public static function deviceId(Request $request, mixed $bodyDeviceId = null): string
    {
        return DeviceId::from($request->headers->get('X-Device-Id'), $bodyDeviceId);
    }

    /** El token de `Authorization: Bearer …`, recortado; null si no hay. */
    public static function bearer(Request $request): ?string
    {
        $auth = (string) $request->headers->get('Authorization', '');
        if (preg_match('/^Bearer\s+(.+)$/i', $auth, $m) !== 1) {
            return null;
        }

        return trim($m[1]);
    }
}
