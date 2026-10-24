<?php

namespace App\Filament\Support;

use App\Enums\HeldFor;
use App\Enums\ListingStatus;
use App\Models\Ban;
use App\Models\Report;
use App\Moderation\Signals;

/** How the admin names codes. The admin is for moderators and reads in English. */
final class Labels
{
    public static function signal(string $code): string
    {
        return match ($code) {
            Signals::BANNED_CONTACT => 'Banned number or handle',
            Signals::CONTACT_ELSEWHERE => 'Contact used by another account',
            Signals::BANNED_WORD => 'Banned word',
            Signals::CONTACT_IN_TEXT => 'Number or link in the text',
            Signals::MANY_LISTINGS => 'Many listings in 24 hours',
            'reported_before' => 'Earlier listing reported or removed',
            default => $code,
        };
    }

    public static function status(ListingStatus $status): string
    {
        return match ($status) {
            ListingStatus::Unverified => 'Email not confirmed',
            ListingStatus::Pending => 'Waiting for review',
            ListingStatus::Published => 'On the board',
            ListingStatus::Rejected => 'Rejected',
            ListingStatus::Removed => 'Removed',
        };
    }

    /** Waiting is amber, live is green, refused or taken down is red. */
    public static function statusColor(ListingStatus $status): string
    {
        return match ($status) {
            ListingStatus::Unverified => 'gray',
            ListingStatus::Pending => 'warning',
            ListingStatus::Published => 'success',
            ListingStatus::Rejected, ListingStatus::Removed => 'danger',
        };
    }

    public static function reportStatus(string $status): string
    {
        return match ($status) {
            Report::OPEN => 'Open',
            Report::DISMISSED => 'Dismissed',
            Report::ACTIONED => 'Acted on',
            default => $status,
        };
    }

    public static function banKind(string $kind): string
    {
        return match ($kind) {
            Ban::ACCOUNT => 'Account',
            Ban::NUMBER => 'Number',
            Ban::INSTAGRAM => 'Instagram',
            default => $kind,
        };
    }

    /** An audit log action, e.g. "ban_lifted" → "Ban lifted". */
    public static function action(string $action): string
    {
        return ucfirst(str_replace('_', ' ', $action));
    }

    public static function heldFor(?HeldFor $heldFor): string
    {
        return match ($heldFor) {
            HeldFor::FirstListing => 'First listing',
            HeldFor::Launch => 'Launch phase',
            HeldFor::Signal => 'Signal',
            HeldFor::Reports => 'Hidden by reports',
            null => '-',
        };
    }

    public static function reason(?string $code): string
    {
        return $code === null ? '-' : (config("princess.moderation.reasons.$code") ?? ($code === 'account_banned' ? 'Account banned' : $code));
    }

    /** @return array<string, string> */
    public static function reasons(): array
    {
        return config('princess.moderation.reasons');
    }

    public static function category(?string $slug): string
    {
        return $slug === null ? '-' : (config("princess.categories.$slug") ?? $slug);
    }
}
