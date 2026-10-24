<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Listing;
use App\Moderation\Moderation;
use App\Support\ClientKey;
use App\Support\JsText;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class ReportController extends Controller
{
    /**
     * A visitor reports a published listing: a reason from the list and an optional note. No
     * account is needed and nothing about her is kept with the report; her address only counts
     * toward a limit, as a keyed hash: reports_per_ip_per_hour in all, and one report per listing
     * in report_once_seconds (under a day, so with princess:prune-expired it is gone within 24 hours).
     */
    public function store(Request $request, string $id): JsonResponse
    {
        $listing = Listing::query()->published()->whereKey($id)->firstOrFail();

        $errors = [];
        $reason = $request->input('reason');
        if ($reason === null || $reason === '') {
            $errors['reason'] = 'required';
        } elseif (! is_string($reason) || ! array_key_exists($reason, config('princess.moderation.report_reasons'))) {
            $errors['reason'] = 'invalid';
        }
        $note = $request->input('note');
        if ($note !== null && ! is_string($note)) {
            $errors['note'] = 'invalid';
        } elseif (is_string($note)) {
            $note = JsText::trim($note);
            if (JsText::length($note) > config('princess.moderation.report_note_max')) {
                $errors['note'] = 'too_long';
            }
        }
        if ($errors !== []) {
            return response()->json(['errors' => $errors], 422);
        }

        // a keyed hash of the listing and her address: the cache cannot tell who reported what
        $once = 'report:'.ClientKey::of('report', $listing->getKey(), (string) $request->ip());
        if (RateLimiter::tooManyAttempts($once, 1)) {
            return response()->json(['error' => 'already_reported'], 429, ['Retry-After' => RateLimiter::availableIn($once)]);
        }
        RateLimiter::hit($once, config('princess.moderation.report_once_seconds'));

        Moderation::receiveReport($listing, $reason, $note === '' ? null : $note);

        return response()->json(['received' => true], 202);
    }
}
