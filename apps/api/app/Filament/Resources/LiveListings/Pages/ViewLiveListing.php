<?php

namespace App\Filament\Resources\LiveListings\Pages;

use App\Filament\Resources\LiveListings\LiveListingResource;
use App\Filament\Support\ListingPageTitle;
use App\Filament\Support\ModerationActions;
use Filament\Resources\Pages\ViewRecord;

class ViewLiveListing extends ViewRecord
{
    use ListingPageTitle;

    protected static string $resource = LiveListingResource::class;

    protected function getHeaderActions(): array
    {
        return [ModerationActions::remove(LiveListingResource::getUrl('index'))];
    }
}
