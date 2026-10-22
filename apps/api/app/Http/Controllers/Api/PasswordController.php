<?php

namespace App\Http\Controllers\Api;

use App\Accounts\AccountInput;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class PasswordController extends Controller
{
    /**
     * Sends a reset link if the email has an account. The answer is the same either way, so this
     * cannot be used to learn who has an account.
     */
    public function forgot(Request $request): JsonResponse
    {
        $email = AccountInput::email($request->input('email'));
        if ($email === '') {
            return response()->json(['errors' => ['email' => 'required']], 422);
        }
        Password::broker()->sendResetLink(['email' => $email]);

        return response()->json(['sent' => true], 202);
    }

    /** A new password from the link. Every existing sign-in ends with the old password. */
    public function reset(Request $request): JsonResponse
    {
        $errors = AccountInput::passwordErrors($request->input('password'));
        $token = $request->input('token');
        $email = AccountInput::email($request->input('email'));
        if (! is_string($token) || $token === '' || $email === '') {
            $errors = ['token' => 'invalid'] + $errors;
        }
        if ($errors !== []) {
            return response()->json(['errors' => $errors], 422);
        }

        $status = Password::broker()->reset(
            ['email' => $email, 'token' => $token, 'password' => $request->input('password')],
            function (User $user, string $password) {
                DB::transaction(function () use ($user, $password) {
                    $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();
                    $user->tokens()->delete();
                    DB::table('sessions')->where('user_id', $user->getKey())->delete();
                });
            },
        );

        return $status === Password::PASSWORD_RESET
            ? response()->json(['reset' => true])
            : response()->json(['errors' => ['token' => 'invalid']], 422);
    }
}
