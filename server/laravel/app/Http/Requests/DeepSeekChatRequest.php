<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class DeepSeekChatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'model' => ['sometimes', 'string', Rule::in(['deepseek-chat', 'deepseek-reasoner'])],
            'messages' => ['required', 'array', 'min:1', 'max:24'],
            'messages.*.role' => ['required', 'string', Rule::in(['system', 'user', 'assistant'])],
            'messages.*.content' => ['required', 'string', 'max:24000'],
            'stream' => ['sometimes', 'boolean'],
            'temperature' => ['sometimes', 'numeric', 'between:0,2'],
            'max_tokens' => ['sometimes', 'integer', 'between:16,4096'],
        ];
    }

    /**
     * Carga útil ya saneada que se reenvía a DeepSeek.
     *
     * @return array<string, mixed>
     */
    public function payload(): array
    {
        return [
            'model' => $this->string('model', 'deepseek-chat')->toString(),
            'messages' => $this->array('messages'),
            'stream' => $this->boolean('stream', true),
            'temperature' => (float) $this->input('temperature', 1.0),
            'max_tokens' => (int) $this->input('max_tokens', 2048),
        ];
    }
}
