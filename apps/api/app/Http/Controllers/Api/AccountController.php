<?php

namespace App\Http\Controllers\Api;

use App\Accounts\AccountDeletion;
use App\Accounts\SignIn;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;

/** Her own account: what it is, her listings in every state, and deleting it. */
class AccountController extends Controller
{
    /** @return array{email: string, verified: bool} */
    public static function summary(User $user): array
    {
        return ['email' => $user->email, 'verified' => $user->hasVerifiedEmail()];
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json(self::summary($request->user()));
    }

    /** Every listing of hers, newest first, with where each one is. Only she sees this. */
    public function listings(Request $request): JsonResponse
    {
        $items = $request->user()->listings()->with('photo')->orderByDesc('created_at')->orderBy('id')->get()
            ->map(fn ($listing) => [
                ...$listing->toPublic(),
                // she sees her own photo whatever its state, through a signed address
                'photo' => $listing->photo?->toClient(privateAllowed: true),
                'status' => $listing->status->value,
                'reject_reason' => $listing->reject_reason,
            ]);

        return response()->json(['items' => $items->all()]);
    }

    /**
     * Deletes the account and everything that is hers, at once: her listings (and with them
     * their photos), every sign-in, any password-reset request. Nothing is kept. Her password
     * is asked again, so a phone left signed in cannot do this.
     */
    public function destroy(Request $request): JsonResponse|Response
    {
        $user = $request->user();
        $password = $request->input('password');
        if (! is_string($password) || $password === '') {
            return response()->json(['errors' => ['password' => 'required']], 422);
        }
        if (! Hash::check($password, $user->password)) {
            return response()->json(['errors' => ['password' => 'wrong_password']], 422);
        }

        SignIn::end($request);
        AccountDeletion::run($user);

        return response()->noContent();
    }
}
