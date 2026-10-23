<?php

namespace App\Filament\Resources\ReviewQueue;

use App\Enums\ListingStatus;
use App\Filament\Resources\ReviewQueue\Pages\ListReviewQueue;
use App\Filament\Resources\ReviewQueue\Pages\ReviewListing;
use App\Filament\Support\Labels;
use App\Filament\Support\ListingInfolist;
use App\Models\Listing;
use BackedEnum;
use Filament\Actions\ViewAction;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/** Listings waiting for a moderator, oldest first. Open one to approve or reject it. */
class ReviewQueueResource extends Resource
{
    protected static ?string $model = Listing::class;

    protected static ?string $slug = 'queue';

    protected static ?string $navigationLabel = 'Review queue';

    protected static ?string $modelLabel = 'listing';

    protected static ?int $navigationSort = 1;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedInboxStack;

    protected static ?string $recordTitleAttribute = 'title';

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with('photo')->where('status', ListingStatus::Pending);
    }

    public static function getNavigationBadge(): ?string
    {
        $count = static::getEloquentQuery()->count();

        return $count > 0 ? (string) $count : null;
    }

    public static function infolist(Schema $schema): Schema
    {
        return ListingInfolist::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('created_at')
            ->columns([
                TextColumn::make('created_at')->label('Waiting')->since()->sortable(),
                TextColumn::make('held_for')->label('Because')->formatStateUsing(fn ($state) => Labels::heldFor($state)),
                TextColumn::make('signals')->badge()->color('warning')->formatStateUsing(fn (string $state) => Labels::signal($state)),
                TextColumn::make('title')->limit(50),
                TextColumn::make('category')->formatStateUsing(fn (string $state) => Labels::category($state)),
                TextColumn::make('country'),
            ])
            ->recordActions([ViewAction::make()->label('Review')])
            ->recordUrl(fn (Listing $record) => static::getUrl('view', ['record' => $record]))
            ->emptyStateHeading('Nothing is waiting');
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
            'index' => ListReviewQueue::route('/'),
            'view' => ReviewListing::route('/{record}'),
        ];
    }
}
