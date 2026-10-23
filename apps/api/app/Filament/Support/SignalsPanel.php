<?php

namespace App\Filament\Support;

use App\Enums\ListingStatus;
use App\Models\Ban;
use App\Models\Listing;
use App\Models\Report;
use Illuminate\Support\Carbon;

/** What the moderator should know about a listing beyond its own words. Each method gives lines of text. */
final class SignalsPanel
{
    /** @return list<string> other listings with one of its numbers or its handle */
    public static function sameContacts(Listing $listing): array
    {
        $numbers = array_values(array_filter([$listing->whatsapp, $listing->phone]));
        $others = Listing::query()->whereKeyNot($listing->getKey())->where(function ($q) use ($numbers, $listing) {
            $q->whereIn('whatsapp', $numbers ?: [''])->orWhereIn('phone', $numbers ?: ['']);
            if ($listing->social !== null) {
                $q->orWhereRaw('LOWER(social) = ?', [mb_strtolower($listing->social)]);
            }
        })->latest()->limit(20)->get();

        return $others->map(fn (Listing $o) => sprintf('%s · %s · %s · %s',
            $o->status->value,
            $o->user_id === $listing->user_id ? 'her account' : 'another account',
            mb_substr($o->title, 0, 50),
            $o->created_at->toDateString(),
        ))->all();
    }

    /** @return list<string> her account at a glance */
    public static function account(Listing $listing): array
    {
        $user = $listing->user;
        if ($user === null) {
            return ['The account was deleted.'];
        }
        $counts = $user->listings()->selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status');
        $reports = Report::query()->whereIn('listing_id', $user->listings()->select('id'));

        return [
            'Account created '.$user->created_at->diffForHumans().', email '.($user->hasVerifiedEmail() ? 'verified' : 'not verified').'.',
            'Listings: '.collect(ListingStatus::cases())->map(fn ($s) => $s->value.' '.($counts[$s->value] ?? 0))->implode(', ').'.',
            'Reports on her listings: '.(clone $reports)->open()->count().' open, '.$reports->count().' in all.',
            'Listings in the last 24 hours: '.$user->listings()->where('created_at', '>', Carbon::now()->subDay())->count().'.',
            Ban::accountIsBanned($user) ? 'This account is banned.' : 'This account is not banned.',
        ];
    }

    /** @return list<string> active bans on this account or on its numbers and handle */
    public static function bans(Listing $listing): array
    {
        $numbers = array_values(array_filter([$listing->whatsapp, $listing->phone]));
        $handle = $listing->social !== null ? Ban::normalize(Ban::INSTAGRAM, $listing->social) : null;

        return Ban::query()->active()->where(function ($q) use ($numbers, $handle, $listing) {
            $q->where(fn ($q) => $q->where('kind', Ban::ACCOUNT)->where('value', (string) $listing->user_id))
                ->orWhere(fn ($q) => $q->where('kind', Ban::NUMBER)->whereIn('value', $numbers ?: ['']));
            if ($handle !== null) {
                $q->orWhere(fn ($q) => $q->where('kind', Ban::INSTAGRAM)->where('value', $handle));
            }
        })->get()->map(fn (Ban $b) => "{$b->kind} {$b->value} · ".Labels::reason($b->reason).' · since '.$b->created_at->toDateString())->all();
    }
}
