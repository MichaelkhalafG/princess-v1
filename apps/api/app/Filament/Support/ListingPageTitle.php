<?php

namespace App\Filament\Support;

/**
 * For a page that shows one listing: its heading is the listing's title, laid out in its own
 * direction, and the breadcrumb leads back to the list it was opened from.
 */
trait ListingPageTitle
{
    public function getTitle(): string
    {
        return Bidi::isolate($this->getRecord()->title);
    }

    /** @return array<string, string> */
    public function getBreadcrumbs(): array
    {
        $resource = static::getResource();

        return [$resource::getUrl('index') => $resource::getNavigationLabel()];
    }
}
