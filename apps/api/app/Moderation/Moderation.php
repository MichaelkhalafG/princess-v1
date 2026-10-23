<?php

namespace App\Moderation;

use App\Enums\ListingStatus;
use App\Models\Ban;
use App\Models\Listing;
use App\Models\ModerationEvent;
use App\Models\Moderator;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Every moderator decision, and its line in the audit log. The admin calls only these; nothing
 * else changes a listing's moderation state. Moderators approve, reject and remove; they never
 * edit what she wrote.
 */
final class Moderation
{
    public const BANNED_ACCOUNT_REASON = 'account_banned';

    /** A waiting listing goes on the board. Her account becomes trusted (User::isTrusted). */
    public static function approve(Listing $listing, Moderator $moderator): void
    {
        self::expect($listing, [ListingStatus::Pending]);
        DB::transaction(function () use ($listing, $moderator) {
            $now = Carbon::now();
            $listing->forceFill([
                'status' => ListingStatus::Published, 'held_for' => null, 'published_at' => $now,
                'reviewed_at' => $now, 'reviewed_by' => $moderator->getKey(), 'reject_reason' => null,
            ])->save();
            self::log($moderator, 'approved', listing: $listing);
        });
    }

    /** A waiting listing is refused; she sees the reason on her listings page. */
    public static function reject(Listing $listing, Moderator $moderator, string $reason, bool $ban = false): void
    {
        self::expect($listing, [ListingStatus::Pending]);
        self::expectReason($reason);
        DB::transaction(function () use ($listing, $moderator, $reason, $ban) {
            self::close($listing, $moderator, ListingStatus::Rejected, $reason);
            self::log($moderator, 'rejected', listing: $listing, reason: $reason);
            if ($ban) {
                self::banAccount($listing->user, $moderator, $reason);
            }
        });
    }

    /**
     * A listing on the board (or one hidden by reports) is taken down. Her account goes back to
     * review for its next listing.
     */
    public static function remove(Listing $listing, Moderator $moderator, string $reason, bool $ban = false): void
    {
        self::expect($listing, [ListingStatus::Published, ListingStatus::Pending]);
        self::expectReason($reason);
        DB::transaction(function () use ($listing, $moderator, $reason, $ban) {
            self::close($listing, $moderator, ListingStatus::Removed, $reason);
            self::log($moderator, 'removed', listing: $listing, reason: $reason);
            if ($ban) {
                self::banAccount($listing->user, $moderator, $reason);
            }
        });
    }

    /**
     * Bans her account and every number and handle on any of her listings. Her published listings
     * come down and her waiting ones are refused. She can still sign in, see her listings and
     * delete her account; she cannot post. Lasts until a moderator lifts it.
     */
    public static function banAccount(User $user, Moderator $moderator, string $reason): void
    {
        DB::transaction(function () use ($user, $moderator, $reason) {
            $values = [[Ban::ACCOUNT, (string) $user->getKey()]];
            foreach ($user->listings()->get(['whatsapp', 'phone', 'social']) as $l) {
                foreach ([$l->whatsapp, $l->phone] as $number) {
                    if ($number !== null) {
                        $values[] = [Ban::NUMBER, $number];
                    }
                }
                if ($l->social !== null) {
                    $values[] = [Ban::INSTAGRAM, Ban::normalize(Ban::INSTAGRAM, $l->social)];
                }
            }
            foreach (array_unique($values, SORT_REGULAR) as [$kind, $value]) {
                $exists = Ban::query()->active()->where('kind', $kind)->where('value', $value)->exists();
                if (! $exists) {
                    $ban = Ban::create(['kind' => $kind, 'value' => $value, 'user_id' => $user->getKey(), 'reason' => $reason, 'created_by' => $moderator->getKey()]);
                    self::log($moderator, 'banned', user: $user, ban: $ban, reason: $reason);
                }
            }

            foreach ($user->listings()->whereIn('status', [ListingStatus::Published, ListingStatus::Pending, ListingStatus::Unverified])->get() as $listing) {
                $status = $listing->status === ListingStatus::Published ? ListingStatus::Removed : ListingStatus::Rejected;
                self::close($listing, $moderator, $status, self::BANNED_ACCOUNT_REASON);
                self::log($moderator, $status === ListingStatus::Removed ? 'removed' : 'rejected', listing: $listing, reason: self::BANNED_ACCOUNT_REASON);
            }
        });
    }

    /** A number or handle banned by hand, from the admin. */
    public static function addBan(Moderator $moderator, string $kind, string $value, string $reason): Ban
    {
        if (! in_array($kind, [Ban::NUMBER, Ban::INSTAGRAM], true)) {
            throw new InvalidArgumentException("Only numbers and handles are banned by hand, not $kind.");
        }
        self::expectReason($reason);

        return DB::transaction(function () use ($moderator, $kind, $value, $reason) {
            $ban = Ban::create(['kind' => $kind, 'value' => Ban::normalize($kind, $value), 'reason' => $reason, 'created_by' => $moderator->getKey()]);
            self::log($moderator, 'banned', ban: $ban, reason: $reason);

            return $ban;
        });
    }

    public static function lift(Ban $ban, Moderator $moderator): void
    {
        if ($ban->lifted_at !== null) {
            return;
        }
        DB::transaction(function () use ($ban, $moderator) {
            $ban->forceFill(['lifted_at' => Carbon::now(), 'lifted_by' => $moderator->getKey()])->save();
            self::log($moderator, 'ban_lifted', user: $ban->user, ban: $ban);
        });
    }

    public static function log(?Moderator $moderator, string $action, ?Listing $listing = null, ?User $user = null, ?Ban $ban = null, ?string $reason = null): void
    {
        ModerationEvent::create([
            'moderator_id' => $moderator?->getKey(),
            'action' => $action,
            'listing_id' => $listing?->getKey(),
            'user_id' => $user?->getKey() ?? $listing?->user_id,
            'ban_id' => $ban?->getKey(),
            'reason' => $reason,
            'created_at' => Carbon::now(),
        ]);
    }

    private static function close(Listing $listing, Moderator $moderator, ListingStatus $status, string $reason): void
    {
        $listing->forceFill([
            'status' => $status, 'held_for' => null, 'reviewed_at' => Carbon::now(),
            'reviewed_by' => $moderator->getKey(), 'reject_reason' => $reason,
        ])->save();
    }

    /** @param list<ListingStatus> $allowed */
    private static function expect(Listing $listing, array $allowed): void
    {
        if (! in_array($listing->status, $allowed, true)) {
            throw new InvalidArgumentException("This listing is {$listing->status->value}; that decision does not apply to it.");
        }
    }

    private static function expectReason(string $reason): void
    {
        if (! array_key_exists($reason, config('princess.moderation.reasons'))) {
            throw new InvalidArgumentException("Unknown reason: $reason.");
        }
    }
}
