<?php

namespace App\Filament\Resources\LiveListings;

use App\Enums\ListingStatus;
use App\Filament\Resources\LiveListings\Pages\ListLiveListings;
use App\Filament\Resources\LiveListings\Pages\ViewLiveListing;
use App\Filament\Support\Labels;
use App\Filament\Support\ListingInfolist;
use App\Models\Listing;
use BackedEnum;
use Filament\Actions\ViewAction;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/** What is on the board now. Search it; open one to remove it. */
class LiveListingResource extends Resource
{
    protected static ?string $model = Listing::class;

    protected static ?string $slug = 'live';

    protected static ?string $navigationLabel = 'Live listings';

    protected static ?string $modelLabel = 'listing';

    protected static ?int $navigationSort = 3;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedGlobeAlt;

    protected static ?string $recordTitleAttribute = 'title';

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with('photo')->where('status', ListingStatus::Published);
    }

    public static function infolist(Schema $schema): Schema
    {
        return ListingInfolist::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('published_at', 'desc')
            ->columns([
                TextColumn::make('published_at')->label('Published')->since()->sortable(),
                TextColumn::make('title')->limit(50)->searchable(),
                TextColumn::make('name')->searchable(),
                TextColumn::make('category')->formatStateUsing(fn (string $state) => Labels::category($state)),
                TextColumn::make('country'),
                TextColumn::make('whatsapp')->label('WhatsApp')->searchable()->toggleable(),
                TextColumn::make('phone')->searchable()->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('social')->label('Instagram')->searchable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('country')->options(array_combine(array_keys(config('princess.countries')), array_keys(config('princess.countries')))),
                SelectFilter::make('category')->options(config('princess.categories')),
            ])
            ->recordActions([ViewAction::make()]);
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit(Model $record): bool
    {
        return false;
    }

    public static function canDelete(Model $record): bool
    {
        return false;
    }

    public static function getPages(): array
    {
        return [
            'index' => ListLiveListings::route('/'),
            'view' => ViewLiveListing::route('/{record}'),
        ];
    }
}
