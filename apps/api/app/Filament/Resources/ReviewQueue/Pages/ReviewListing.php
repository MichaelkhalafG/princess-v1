<?php

namespace App\Filament\Resources\ReviewQueue\Pages;

use App\Filament\Resources\ReviewQueue\ReviewQueueResource;
use App\Filament\Support\ListingPageTitle;
use App\Filament\Support\ModerationActions;
use Filament\Resources\Pages\ViewRecord;

/** One waiting listing, in full, with the decision to make. Back to the queue afterwards. */
class ReviewListing extends ViewRecord
{
    use ListingPageTitle;

    protected static string $resource = ReviewQueueResource::class;

    protected function getHeaderActions(): array
    {
        $queue = ReviewQueueResource::getUrl('index');

        return [
            ModerationActions::approve($queue),
            ModerationActions::reject($queue),
            ModerationActions::remove($queue)->label('Remove')->visible(fn ($record) => $record->held_for?->value === 'reports'),
        ];
    }
}
