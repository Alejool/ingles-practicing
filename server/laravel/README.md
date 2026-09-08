# Proxy DeepSeek en Laravel

Cuatro archivos y una variable de entorno.

1. Copia `app/Http/Requests/DeepSeekChatRequest.php` y
   `app/Http/Controllers/Api/DeepSeekController.php` a tu proyecto.
2. Añade el bloque `'deepseek' => [...]` de `config/services.php` a tu `config/services.php`.
3. Añade la ruta de `routes/api.php`.
4. En `.env`:

   ```
   DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
   DEEPSEEK_URL=https://api.deepseek.com/chat/completions
   ```

5. En `config/cors.php`, permite el origen desde el que sirves la PWA:

   ```php
   'paths' => ['api/*'],
   'allowed_methods' => ['POST', 'OPTIONS'],
   'allowed_origins' => ['https://ruta.tudominio.com'],
   'allowed_headers' => ['Content-Type', 'Authorization'],
   'supports_credentials' => false,
   ```

6. En la app: **Ajustes → Endpoint** = `https://tu-api.com/api/deepseek/chat`, con la API key vacía.

## Nota sobre el streaming

`response()->stream()` funciona con `php artisan serve` y con PHP-FPM.
Detrás de Nginx necesitas desactivar el buffer, o los tokens llegarán todos de golpe al final:

```nginx
location /api/deepseek/ {
    proxy_buffering off;
    fastcgi_buffering off;
    gzip off;
}
```

El header `X-Accel-Buffering: no` que envía el controlador ya lo desactiva en la mayoría de configuraciones.
