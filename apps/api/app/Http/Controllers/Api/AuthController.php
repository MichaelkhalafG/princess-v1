<?php

namespace App\Http\Controllers\Api;

use App\Accounts\AccountInput;
use App\Accounts\SignIn;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

/** Signing in and out. An unverified account may sign in: that is how she asks for a new link. */
class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $email = AccountInput::email($request->input('email'));
        $password = $request->input('password');
        if ($email === '' || ! is_string($password) || $password === '') {
            return response()->json(['errors' => array_filter([
                'email' => $email === '' ? 'required' : null,
                'password' => ! is_string($password) || $password === '' ? 'required' : null,
            ])], 422);
        }
        // one answer whether the email is unknown or the password wrong
        if (! Auth::guard('web')->validate(['email' => $email, 'password' => $password])) {
            return response()->json(['errors' => ['email' => 'wrong_credentials']], 422);
        }
        $user = User::query()->where('email', $email)->firstOrFail();

        return response()->json(AccountController::summary($user) + SignIn::start($request, $user));
    }

    public function logout(Request $request): Response
    {
        SignIn::end($request);

        return response()->noContent();
    }
}
