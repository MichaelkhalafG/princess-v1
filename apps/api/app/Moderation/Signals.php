<?php

namespace App\Moderation;

use App\Models\Ban;
use App\Models\Listing;
use App\Support\ArabicFold;
use Illuminate\Support\Carbon;

/**
 * The automatic filter: reasons to show a listing to a moderator before it reaches the board.
 * It never refuses anything on its own. Each signal is a code; the admin shows them on the review
 * screen, and PublishDecision holds a trusted account's listing when there is any.
 */
final class Signals
{
    /** A number, WhatsApp number or Instagram handle on it is banned. */
    public const BANNED_CONTACT = 'banned_contact';

    /** One of its numbers or its handle is also on another account's listing. */
    public const CONTACT_ELSEWHERE = 'contact_elsewhere';

    /** Its text has a word from the banned list. */
    public const BANNED_WORD = 'banned_word';

    /** Its text carries a way to reach someone outside the contact fields: a number, a link, a handle. */
    public const CONTACT_IN_TEXT = 'contact_in_text';

    /** Her account has posted many listings in the last 24 hours. */
    public const MANY_LISTINGS = 'many_listings';

    /** @return list<string> */
    public static function for(Listing $listing): array
    {
        $signals = [];
        $numbers = array_values(array_filter([$listing->whatsapp, $listing->phone]));
        $handle = $listing->social !== null ? Ban::normalize(Ban::INSTAGRAM, $listing->social) : null;

        $banned = Ban::query()->active()->where(function ($q) use ($numbers, $handle) {
            $q->where(fn ($q) => $q->where('kind', Ban::NUMBER)->whereIn('value', $numbers ?: ['']));
            if ($handle !== null) {
                $q->orWhere(fn ($q) => $q->where('kind', Ban::INSTAGRAM)->where('value', $handle));
            }
        })->exists();
        if ($banned) {
            $signals[] = self::BANNED_CONTACT;
        }

        $elsewhere = Listing::query()->where('user_id', '!=', $listing->user_id)->where(function ($q) use ($numbers, $listing) {
            $q->whereIn('whatsapp', $numbers ?: [''])->orWhereIn('phone', $numbers ?: ['']);
            if ($listing->social !== null) {
                $q->orWhereRaw('LOWER(social) = ?', [mb_strtolower($listing->social)]);
            }
        })->exists();
        if ($elsewhere) {
            $signals[] = self::CONTACT_ELSEWHERE;
        }

        $text = implode(' ', [$listing->name, $listing->title, $listing->description]);
        if (self::hasBannedWord($text)) {
            $signals[] = self::BANNED_WORD;
        }
        if (self::hasContactInText($text)) {
            $signals[] = self::CONTACT_IN_TEXT;
        }

        $recent = Listing::query()->where('user_id', $listing->user_id)
            ->where('created_at', '>', Carbon::now()->subDay())
            ->when($listing->exists, fn ($q) => $q->whereKeyNot($listing->getKey()))
            ->count() + 1;
        if ($recent >= config('princess.moderation.many_listings_per_day')) {
            $signals[] = self::MANY_LISTINGS;
        }

        return $signals;
    }

    /** Whole words after the fold; a word with a common prefix (و، ف، ب، ل، ال، بال...) still counts. */
    public static function hasBannedWord(string $text): bool
    {
        $words = preg_split('/[^\p{L}\p{N}]+/u', ArabicFold::fold($text), -1, PREG_SPLIT_NO_EMPTY);
        $bare = array_map(fn (string $w) => preg_replace('/^(?:وال|بال|فال|كال|لل|ال|و|ف|ب|ل)(?=\p{L}{2,})/u', '', $w), $words);
        $line = ' '.implode(' ', $words).' ';
        $bareLine = ' '.implode(' ', $bare).' ';
        foreach (config('princess.moderation.banned_words') as $entry) {
            $needle = ' '.implode(' ', preg_split('/[^\p{L}\p{N}]+/u', ArabicFold::fold($entry), -1, PREG_SPLIT_NO_EMPTY)).' ';
            if (str_contains($line, $needle) || str_contains($bareLine, $needle)) {
                return true;
            }
        }

        return false;
    }

    /**
     * A phone number (eight digits or more, at most one space, dot, dash or bracket between two of
     * them, so "1500 - 2000" is a price and not a number), a link, or an @handle.
     */
    public static function hasContactInText(string $text): bool
    {
        $latin = preg_replace_callback('/[\x{0660}-\x{0669}\x{06F0}-\x{06F9}]/u', fn (array $d) => (string) (mb_ord($d[0]) & 0xF), $text);

        return preg_match('/\d(?:[ .()\-]?\d){7,}/u', $latin) === 1
            || preg_match('~https?://|www\.|wa\.me|t\.me|bit\.ly|\b[a-z0-9-]+\.(com|net|org|me|io|co|app|link|eg|sa|ae)\b~iu', $latin) === 1
            || preg_match('/(?<![\p{L}\p{N}])@[A-Za-z0-9._]{2,}/u', $latin) === 1;
    }
}
