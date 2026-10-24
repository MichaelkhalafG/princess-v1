<?php

namespace App\Filament\Resources\Reports\Pages;

use App\Filament\Resources\Reports\ReportedListingResource;
use Filament\Resources\Pages\ListRecords;

class ListReportedListings extends ListRecords
{
    protected static string $resource = ReportedListingResource::class;

    protected static ?string $title = 'Reports';

    /** A top-level list: the sidebar already says where you are. */
    public function getBreadcrumbs(): array
    {
        return [];
    }
}
