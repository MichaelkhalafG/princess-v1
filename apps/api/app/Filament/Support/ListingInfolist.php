<?php

namespace App\Filament\Support;

use App\Enums\ListingStatus;
use App\Models\Listing;
use App\Models\Report;
use Filament\Infolists\Components\ImageEntry;
use Filament\Infolists\Components\RepeatableEntry;
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
                    ImageEntry::make('photo_url')->label('Photo')->hiddenLabel()->imageHeight(320)
                        ->state(fn (Listing $record) => $record->photo?->toClient(privateAllowed: true)['url'] ?? null)
                        ->placeholder('No photo'),
                ]),
                // her words: each laid out in its own direction (Bidi)
                Section::make('Listing')->columnSpan(['default' => 1, 'lg' => 2])->columns(2)->schema([
                    TextEntry::make('title')->columnSpanFull()->extraAttributes(Bidi::SHORT),
                    TextEntry::make('name')->extraAttributes(Bidi::SHORT),
                    TextEntry::make('category')->formatStateUsing(fn (string $state) => Labels::category($state))->extraAttributes(Bidi::SHORT),
                    TextEntry::make('country'),
                    TextEntry::make('city')->extraAttributes(Bidi::SHORT),
                    TextEntry::make('district')->placeholder('-')->extraAttributes(Bidi::SHORT),
                    TextEntry::make('price')->placeholder('-')->extraAttributes(Bidi::SHORT),
                    TextEntry::make('description')->columnSpanFull()->extraAttributes(Bidi::AUTO),
                ]),
            ]),
            Section::make('Contacts')->columns(3)->columnSpanFull()->schema([
                TextEntry::make('whatsapp')->label('WhatsApp')->placeholder('-'),
                TextEntry::make('phone')->placeholder('-'),
                TextEntry::make('social')->label('Instagram')->placeholder('-'),
            ]),
            // what has happened to it so far; a line that does not apply yet is left out
            Section::make('Moderation')->columns(3)->columnSpanFull()->schema([
                TextEntry::make('status')->badge()
                    ->formatStateUsing(fn (ListingStatus $state) => Labels::status($state))
                    ->color(fn (ListingStatus $state) => Labels::statusColor($state)),
                TextEntry::make('held_for')->label('Waiting because')->formatStateUsing(fn ($state) => Labels::heldFor($state))->placeholder('-')
                    ->visible(fn (Listing $record) => $record->status === ListingStatus::Pending),
                TextEntry::make('signals')->label('Signals when submitted')->badge()->color('warning')->placeholder('No signals')
                    ->formatStateUsing(fn (string $state) => Labels::signal($state)),
                TextEntry::make('created_at')->label('Submitted')->dateTime()->since(),
                TextEntry::make('published_at')->label('On the board since')->dateTime()->since()
                    ->visible(fn (Listing $record) => $record->status === ListingStatus::Published),
                TextEntry::make('reviewed_at')->label('Decided')->dateTime()
                    ->visible(fn (Listing $record) => $record->reviewed_at !== null),
                TextEntry::make('reject_reason')->label('Reason')->formatStateUsing(fn (?string $state) => Labels::reason($state))
                    ->visible(fn (Listing $record) => $record->reject_reason !== null),
            ]),
            Section::make('Signals panel')->columns(1)->columnSpanFull()->schema([
                TextEntry::make('panel_same_contacts')->label('Other listings with her numbers or handle')->listWithLineBreaks()->placeholder('None')
                    ->state(fn (Listing $record) => SignalsPanel::sameContacts($record)),
                TextEntry::make('panel_account')->label('Her account')->listWithLineBreaks()
                    ->state(fn (Listing $record) => SignalsPanel::account($record)),
                TextEntry::make('panel_bans')->label('Bans that match')->listWithLineBreaks()->placeholder('None')->color('danger')
                    ->state(fn (Listing $record) => SignalsPanel::bans($record)),
            ]),
            Section::make('Reports')->columnSpanFull()->visible(fn (Listing $record) => $record->reports()->exists())->schema([
                RepeatableEntry::make('reports')->hiddenLabel()->columns(4)->schema([
                    TextEntry::make('reason')->formatStateUsing(fn (string $state) => config("princess.moderation.report_reasons.$state") ?? $state),
                    TextEntry::make('note')->placeholder('-')->columnSpan(2)->extraAttributes(Bidi::AUTO),
                    TextEntry::make('status')->badge()
                        ->formatStateUsing(fn (string $state) => Labels::reportStatus($state))
                        ->color(fn (string $state) => $state === Report::OPEN ? 'warning' : 'gray')
                        ->helperText(fn ($record) => $record?->created_at?->diffForHumans()),
                ]),
            ]),
        ]);
    }
}
