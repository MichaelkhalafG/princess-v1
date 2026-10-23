<?php

namespace App\Filament\Widgets;

use App\Enums\ListingStatus;
use App\Models\Listing;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Carbon;

/** The dashboard: how much is waiting and for how long. */
class QueueOverview extends StatsOverviewWidget
{
    protected function getStats(): array
    {
        $waiting = Listing::query()->where('status', ListingStatus::Pending);
        $oldest = (clone $waiting)->min('created_at');

        return [
            Stat::make('Waiting for review', (clone $waiting)->count()),
            Stat::make('Oldest waiting since', $oldest ? Carbon::parse($oldest)->diffForHumans() : '-'),
            Stat::make('On the board', Listing::query()->where('status', ListingStatus::Published)->count()),
        ];
    }
}
