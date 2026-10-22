<?php

namespace App\Accounts;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * Signs her in the way her client works. The web app's requests come from a stateful domain
 * (Sanctum), so they carry a session: she gets a session cookie. Anything else (the app) gets
 * an API token, returned once, which it sends as "Authorization: Bearer ...".
 */
final class SignIn
{
    /** @return array{token?: string} */
    public static function start(Request $request, User $user): array
    {
        if ($request->hasSession()) {
            Auth::guard('web')->login($user);
            $request->session()->regenerate();

            return [];
        }
        $device = $request->input('device_name');

        return ['token' => $user->createToken(is_string($device) && $device !== '' ? mb_substr($device, 0, 100) : 'app')->plainTextToken];
    }

    /** Ends this sign-in only: this session, or this token. */
    public static function end(Request $request): void
    {
        $token = $request->user()?->currentAccessToken();
        if ($request->hasSession()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        } elseif ($token !== null && method_exists($token, 'delete')) {
            $token->delete();
        }
    }
}
