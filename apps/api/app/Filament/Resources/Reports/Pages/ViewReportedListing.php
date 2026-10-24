<?php

namespace App\Filament\Resources\Reports\Pages;

use App\Filament\Resources\Reports\ReportedListingResource;
use App\Filament\Support\ListingPageTitle;
use App\Filament\Support\ModerationActions;
use Filament\Resources\Pages\ViewRecord;

class ViewReportedListing extends ViewRecord
{
    use ListingPageTitle;

    protected static string $resource = ReportedListingResource::class;

    protected function getHeaderActions(): array
    {
        $back = ReportedListingResource::getUrl('index');

        return [
            ModerationActions::dismissReports($back),
            ModerationActions::remove($back),
        ];
    }
}
