<?php

namespace App\Filament\Resources\Reports\Pages;

use App\Filament\Resources\Reports\ReportedListingResource;
use Filament\Resources\Pages\ListRecords;

class ListReportedListings extends ListRecords
{
    protected static string $resource = ReportedListingResource::class;
}
