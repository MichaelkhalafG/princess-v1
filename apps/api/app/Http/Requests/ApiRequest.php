<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * A request whose validation errors are codes, never sentences: the web and the app turn a
 * code into their own Arabic message. The API answers {"errors": {"field": "code"}}
 * (see bootstrap/app.php).
 */
abstract class ApiRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Keys are matched as patterns against "field.rule", first match wins, so the specific
     * ones come first and "*" catches the rest.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            '*.required' => 'required',
            '*.max' => 'too_long',
            '*' => 'invalid',
        ];
    }
}
