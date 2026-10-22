<?php

namespace App\Listings;

use App\Enums\HeldFor;
use App\Enums\ListingStatus;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Where a new listing goes (line B), decided when she submits it, and again for each of her
 * listings when she verifies her email:
 *   - her email is not verified yet: it waits, in no queue;
 *   - her account is not trusted (see User::isTrusted): a moderator reviews it;
 *   - the launch phase is on: a moderator reviews it;
 *   - otherwise it is published at once. (The signals that can still hold it arrive with the
 *     filter.)
 */
final class PublishDecision
{
    public static function apply(Listing $listing, User $user): void
    {
        $listing->published_at = null;
        $listing->held_for = null;

        if (! $user->hasVerifiedEmail()) {
            $listing->status = ListingStatus::Unverified;
        } elseif (! $user->isTrusted()) {
            $listing->status = ListingStatus::Pending;
            $listing->held_for = HeldFor::FirstListing;
        } elseif (config('princess.moderation.launch_phase')) {
            $listing->status = ListingStatus::Pending;
            $listing->held_for = HeldFor::Launch;
        } else {
            $listing->status = ListingStatus::Published;
            $listing->published_at = Carbon::now();
        }
    }
}
