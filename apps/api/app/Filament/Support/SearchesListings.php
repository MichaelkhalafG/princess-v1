<?php

namespace App\Filament\Support;

use App\Models\Listing;
use Illuminate\Database\Eloquent\Model;

/**
 * For a listings resource: the search box at the top of the admin finds a listing by its title,
 * her name, or any of her numbers or her handle, within that resource's own listings.
 */
trait SearchesListings
{
    /** @return list<string> */
    public static function getGloballySearchableAttributes(): array
    {
        return ['title', 'name', 'whatsapp', 'phone', 'social'];
    }

    public static function getGlobalSearchResultTitle(Model $record): string
    {
        /** @var Listing $record */
        return Bidi::isolate($record->title);
    }

    /** @return array<string, string> */
    public static function getGlobalSearchResultDetails(Model $record): array
    {
        /** @var Listing $record */
        return ['Name' => Bidi::isolate($record->name), 'Status' => Labels::status($record->status)];
    }
}
