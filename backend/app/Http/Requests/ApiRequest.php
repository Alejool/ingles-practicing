<?php

namespace App\Http\Requests;

use App\Http\Support\HttpError;
use App\Http\Support\JsonBody;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Base de los FormRequest de la API. No usa `rules()` de Laravel: sus mensajes y
 * su formato de error no son los de la API Node. Cada acción lee el cuerpo con
 * `JsonBody` (su tope) y construye su comando con los objetos de valor del dominio,
 * que lanzan los códigos y mensajes de siempre.
 */
abstract class ApiRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [];
    }

    /** 405 JSON con CORS, como cada función de Node para un método no previsto. */
    public function assertMethod(string ...$methods): void
    {
        if (! in_array($this->method(), $methods, true)) {
            throw new HttpError(405, 'method_not_allowed', 'Método no permitido.');
        }
    }

    protected function jsonBody(int $maxUnits = JsonBody::DEFAULT_MAX_UNITS): mixed
    {
        return JsonBody::parse($this->getContent(), $maxUnits);
    }

    /** Un campo de un cuerpo que puede no ser un objeto (`body?.campo` de JS). */
    protected static function field(mixed $body, string $name): mixed
    {
        return $body instanceof \stdClass && property_exists($body, $name) ? $body->{$name} : null;
    }
}
