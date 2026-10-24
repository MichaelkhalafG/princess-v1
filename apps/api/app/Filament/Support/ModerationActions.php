<?php

namespace App\Filament\Support;

use App\Enums\HeldFor;
use App\Enums\ListingStatus;
use App\Models\Listing;
use App\Models\Moderator;
use App\Moderation\Moderation;
use Filament\Actions\Action;
use Filament\Facades\Filament;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Toggle;

/** Approve, reject and remove: the admin's only ways to change a listing. */
final class ModerationActions
{
    private static function moderator(): Moderator
    {
        /** @var Moderator */
        return Filament::auth()->user();
    }

    public static function approve(?string $then = null): Action
    {
        return Action::make('approve')->label('Approve')->color('success')->icon('heroicon-o-check')
            ->visible(fn (Listing $record) => $record->status === ListingStatus::Pending)
            ->requiresConfirmation()->modalDescription('It goes on the board now, and her account becomes trusted.')->modalSubmitActionLabel('Approve')
            ->action(fn (Listing $record) => Moderation::approve($record, self::moderator()))
            ->successNotificationTitle('Approved')
            ->successRedirectUrl($then);
    }

    /** The reports were looked at; the listing stays (or, hidden by reports, goes back on the board). */
    public static function dismissReports(?string $then = null): Action
    {
        return Action::make('dismissReports')->label('Dismiss the reports')->color('gray')->icon('heroicon-o-check-circle')
            ->requiresConfirmation()->modalDescription('The listing stays on the board and its open reports are closed.')->modalSubmitActionLabel('Dismiss the reports')
            ->action(fn (Listing $record) => Moderation::dismissReports($record, self::moderator()))
            ->successNotificationTitle('Reports dismissed')
            ->successRedirectUrl($then);
    }

    public static function reject(?string $then = null): Action
    {
        return Action::make('reject')->label('Reject')->color('danger')->icon('heroicon-o-x-mark')
            // a listing hidden by reports was published once: it is removed, not rejected
            ->visible(fn (Listing $record) => $record->status === ListingStatus::Pending && $record->held_for !== HeldFor::Reports)
            ->schema([
                Select::make('reason')->options(Labels::reasons())->required(),
                Toggle::make('ban')->label('Also ban her account, numbers and handle'),
            ])
            ->modalSubmitActionLabel('Reject')
            ->action(fn (Listing $record, array $data) => Moderation::reject($record, self::moderator(), $data['reason'], (bool) ($data['ban'] ?? false)))
            ->successNotificationTitle('Rejected')
            ->successRedirectUrl($then);
    }

    public static function remove(?string $then = null): Action
    {
        return Action::make('remove')->label('Remove')->color('danger')->icon('heroicon-o-trash')
            ->visible(fn (Listing $record) => in_array($record->status, [ListingStatus::Published, ListingStatus::Pending], true))
            ->schema([
                Select::make('reason')->options(Labels::reasons())->required(),
                Toggle::make('ban')->label('Also ban her account, numbers and handle'),
            ])
            ->modalSubmitActionLabel('Remove')
            ->action(fn (Listing $record, array $data) => Moderation::remove($record, self::moderator(), $data['reason'], (bool) ($data['ban'] ?? false)))
            ->successNotificationTitle('Removed')
            ->successRedirectUrl($then);
    }
}
