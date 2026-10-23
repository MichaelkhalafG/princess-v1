<?php

namespace App\Filament\Resources\AuditLog\Pages;

use App\Filament\Resources\AuditLog\ModerationEventResource;
use Filament\Resources\Pages\ListRecords;

class ListModerationEvents extends ListRecords
{
    protected static string $resource = ModerationEventResource::class;
}
