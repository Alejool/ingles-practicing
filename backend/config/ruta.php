<?php

use App\Http\Support\ApiJson;

// Variables propias de la API, con los mismos nombres y valores por defecto que la API Node.
// Cada contexto añade aquí las suyas; fuera de config/ no se llama nunca a env().

return [
    // Orígenes con CORS. Sin definir: `*`.
    'allowed_origins' => ApiJson::parseOrigins(env('ALLOWED_ORIGINS')),

    // Proxies propios delante de nginx: `true` es uno; sin la variable, ninguno.
    // (env() ya convierte "true" en booleano; "2abc" vale 2, como parseInt.)
    'trust_proxy' => env('TRUST_PROXY') === true ? 1 : max(0, (int) env('TRUST_PROXY', 0)),

    // Pimienta de los hashes de IP y del pulso (los valores por defecto los pone Hashing).
    'ip_pepper' => (string) env('IP_PEPPER', ''),
];
