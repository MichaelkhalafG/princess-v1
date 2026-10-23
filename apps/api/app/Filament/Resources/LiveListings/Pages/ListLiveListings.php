<?php

namespace App\Filament\Resources\LiveListings\Pages;

use App\Filament\Resources\LiveListings\LiveListingResource;
use Filament\Resources\Pages\ListRecords;

class ListLiveListings extends ListRecords
{
    protected static string $resource = LiveListingResource::class;
}
