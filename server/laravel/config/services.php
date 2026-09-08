<?php

declare(strict_types=1);

/*
 * Fragmento para config/services.php:
 *
 * .env
 *   DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
 *   DEEPSEEK_URL=https://api.deepseek.com/chat/completions
 */

return [

    // …tus otros servicios…

    'deepseek' => [
        'key' => env('DEEPSEEK_API_KEY'),
        'url' => env('DEEPSEEK_URL', 'https://api.deepseek.com/chat/completions'),
    ],

];
