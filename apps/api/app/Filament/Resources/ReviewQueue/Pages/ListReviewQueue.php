<?php

namespace App\Filament\Resources\ReviewQueue\Pages;

use App\Filament\Resources\ReviewQueue\ReviewQueueResource;
use Filament\Resources\Pages\ListRecords;

class ListReviewQueue extends ListRecords
{
    protected static string $resource = ReviewQueueResource::class;

    protected static ?string $title = 'Review queue';

    /** A top-level list: the sidebar already says where you are. */
    public function getBreadcrumbs(): array
    {
        return [];
    }
}
