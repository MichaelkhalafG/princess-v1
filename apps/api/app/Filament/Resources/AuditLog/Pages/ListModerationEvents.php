<?php

namespace App\Filament\Resources\AuditLog\Pages;

use App\Filament\Resources\AuditLog\ModerationEventResource;
use Filament\Resources\Pages\ListRecords;

class ListModerationEvents extends ListRecords
{
    protected static string $resource = ModerationEventResource::class;

    protected static ?string $title = 'Audit log';

    /** A top-level list: the sidebar already says where you are. */
    public function getBreadcrumbs(): array
    {
        return [];
    }
}
