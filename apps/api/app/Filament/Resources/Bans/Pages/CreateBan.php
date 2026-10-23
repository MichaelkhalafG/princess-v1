<?php

namespace App\Filament\Resources\Bans\Pages;

use App\Filament\Resources\Bans\BanResource;
use App\Models\Moderator;
use App\Moderation\Moderation;
use Filament\Facades\Filament;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Database\Eloquent\Model;

/** A number or handle banned by hand; recorded in the audit log like every other decision. */
class CreateBan extends CreateRecord
{
    protected static string $resource = BanResource::class;

    protected function handleRecordCreation(array $data): Model
    {
        /** @var Moderator $moderator */
        $moderator = Filament::auth()->user();

        return Moderation::addBan($moderator, $data['kind'], $data['value'], $data['reason']);
    }

    protected function getRedirectUrl(): string
    {
        return BanResource::getUrl('index');
    }
}
