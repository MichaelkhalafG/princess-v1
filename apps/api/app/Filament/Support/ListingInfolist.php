<?php

namespace App\Filament\Support;

use App\Models\Listing;
use Filament\Infolists\Components\ImageEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

/** Everything a moderator needs to decide on a listing, the same on every screen. */
final class ListingInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema->components([
            Grid::make(['default' => 1, 'lg' => 3])->columnSpanFull()->schema([
                Section::make('Photo')->columnSpan(1)->schema([
                    ImageEntry::make('photo_url')->hiddenLabel()->imageHeight(320)
                        ->state(fn (Listing $record) => $record->photo?->toClient(privateAllowed: true)['url'] ?? null)
                        ->placeholder('No photo'),
                ]),
                Section::make('Listing')->columnSpan(['default' => 1, 'lg' => 2])->columns(2)->schema([
                    TextEntry::make('title')->columnSpanFull(),
                    TextEntry::make('name'),
                    TextEntry::make('category')->formatStateUsing(fn (string $state) => Labels::category($state)),
                    TextEntry::make('country'),
                    TextEntry::make('city'),
                    TextEntry::make('district')->placeholder('-'),
                    TextEntry::make('price')->placeholder('-'),
                    TextEntry::make('description')->columnSpanFull(),
                ]),
            ]),
            Section::make('Contacts')->columns(3)->columnSpanFull()->schema([
                TextEntry::make('whatsapp')->label('WhatsApp')->placeholder('-'),
                TextEntry::make('phone')->placeholder('-'),
                TextEntry::make('social')->label('Instagram')->placeholder('-'),
            ]),
            Section::make('Why it is here')->columns(3)->columnSpanFull()->schema([
                TextEntry::make('status')->badge()->formatStateUsing(fn ($state) => $state->value),
                TextEntry::make('held_for')->label('Waiting because')->formatStateUsing(fn ($state) => Labels::heldFor($state))->placeholder('-'),
                TextEntry::make('signals')->badge()->color('warning')->placeholder('No signals')
                    ->formatStateUsing(fn (string $state) => Labels::signal($state)),
                TextEntry::make('created_at')->label('Submitted')->dateTime()->since(),
                TextEntry::make('reviewed_at')->label('Decided')->dateTime()->placeholder('-'),
                TextEntry::make('reject_reason')->label('Reason')->formatStateUsing(fn (?string $state) => Labels::reason($state))->placeholder('-'),
            ]),
        ]);
    }
}
