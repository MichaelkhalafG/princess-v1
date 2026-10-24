<?php

namespace App\Filament\Resources\Bans\Pages;

use App\Filament\Resources\Bans\BanResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListBans extends ListRecords
{
    protected static string $resource = BanResource::class;

    protected static ?string $title = 'Bans';

    /** A top-level list: the sidebar already says where you are. */
    public function getBreadcrumbs(): array
    {
        return [];
    }

    protected function getHeaderActions(): array
    {
        return [CreateAction::make()->label('Ban a number or handle')];
    }
}
