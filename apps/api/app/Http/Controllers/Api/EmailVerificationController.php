<?php

namespace App\Http\Controllers\Api;

use App\Enums\ListingStatus;
use App\Http\Controllers\Controller;
use App\Listings\PublishDecision;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;

class EmailVerificationController extends Controller
{
    /**
     * The link from the verification email, passed on by the web app. It needs no sign-in: she
     * may open the email on another phone. Once verified, each of her waiting listings goes
     * where PublishDecision sends it.
     */
    public function verify(Request $request, string $id, string $hash): JsonResponse
    {
        if (! URL::hasCorrectSignature($request, absolute: false)) {
            return response()->json(['error' => 'link_invalid'], 403);
        }
        if (! URL::signatureHasNotExpired($request)) {
            return response()->json(['error' => 'link_expired'], 403);
        }
        $user = User::query()->find($id);
        if ($user === null || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            return response()->json(['error' => 'link_invalid'], 403);
        }

        if (! $user->hasVerifiedEmail()) {
            DB::transaction(function () use ($user) {
                $user->markEmailAsVerified();
                foreach ($user->listings()->where('status', ListingStatus::Unverified)->orderBy('created_at')->get() as $listing) {
                    PublishDecision::apply($listing, $user);
                    $listing->save();
                }
            });
            event(new Verified($user));
        }

        return response()->json([
            'verified' => true,
            'listings' => $user->listings()->orderBy('created_at')->get()
                ->map(fn ($l) => ['id' => $l->id, 'status' => $l->status->value])->all(),
        ]);
    }

    /** A new link, for a signed-in account that has not verified yet. */
    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->hasVerifiedEmail()) {
            return response()->json(['verified' => true]);
        }
        $user->sendEmailVerificationNotification();

        return response()->json(['verified' => false, 'sent' => true], 202);
    }
}
