<?php

namespace App\Accounts;

use App\Support\JsText;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/** The email and password she signs up or signs in with, checked and answered with codes. */
final class AccountInput
{
    /** Trimmed and in lower case: one address, one account, however she types it. */
    public static function email(mixed $raw): string
    {
        return is_string($raw) ? mb_strtolower(JsText::trim($raw), 'UTF-8') : '';
    }

    /**
     * The errors for a new account, by field (empty when it can be created).
     *
     * @return array<string, string>
     */
    public static function newAccountErrors(mixed $email, mixed $password): array
    {
        $validator = Validator::make(
            ['email' => is_string($email) ? self::email($email) : $email],
            ['email' => ['required', 'string', 'max:254', 'email:rfc', Rule::unique('users', 'email')]],
            self::messages(),
        );

        return array_map(fn (array $codes) => $codes[0], $validator->errors()->toArray()) + self::passwordErrors($password);
    }

    /**
     * At least password_min_chars characters, at most password_max_bytes bytes (bcrypt would
     * silently ignore the rest).
     *
     * @return array<string, string>
     */
    public static function passwordErrors(mixed $password): array
    {
        $validator = Validator::make(
            ['password' => $password],
            ['password' => ['required', 'string', 'min:'.config('princess.accounts.password_min_chars')]],
            self::messages(),
        );
        $errors = array_map(fn (array $codes) => $codes[0], $validator->errors()->toArray());
        if ($errors === [] && strlen($password) > config('princess.accounts.password_max_bytes')) {
            $errors['password'] = 'too_long';
        }

        return $errors;
    }

    /** @return array<string, string> */
    private static function messages(): array
    {
        return [
            'email.required' => 'required',
            'email.max' => 'too_long',
            'email.unique' => 'taken',
            'email.*' => 'invalid',
            'password.required' => 'required',
            'password.min' => 'too_short',
            'password.*' => 'invalid',
        ];
    }
}
