<?php

namespace App\Filament\Resources\Reports;

use App\Filament\Resources\Reports\Pages\ListReportedListings;
use App\Filament\Resources\Reports\Pages\ViewReportedListing;
use App\Filament\Support\ListingInfolist;
use App\Models\Listing;
use App\Models\Report;
use BackedEnum;
use Filament\Actions\ViewAction;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/** Listings with open reports, the most reported first. Dismiss the reports, or remove the listing. */
class ReportedListingResource extends Resource
{
    protected static ?string $model = Listing::class;

    protected static ?string $slug = 'reports';

    protected static ?string $navigationLabel = 'Reports';

    protected static ?string $modelLabel = 'reported listing';

    protected static ?int $navigationSort = 2;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedFlag;

    protected static ?string $recordTitleAttribute = 'title';

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->with('photo')
            ->whereHas('reports', fn ($q) => $q->open())
            ->withCount(['reports as open_reports_count' => fn ($q) => $q->open()])
            ->withMax(['reports as last_report_at' => fn ($q) => $q->open()], 'created_at');
    }

    public static function getNavigationBadge(): ?string
    {
        $count = Listing::query()->whereHas('reports', fn ($q) => $q->open())->count();

        return $count > 0 ? (string) $count : null;
    }

    public static function infolist(Schema $schema): Schema
    {
        return ListingInfolist::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('open_reports_count', 'desc')
            ->columns([
                TextColumn::make('open_reports_count')->label('Open reports')->sortable(),
                TextColumn::make('last_report_at')->label('Last report')->since()->sortable(),
                TextColumn::make('report_reasons')->label('Reasons')->badge()
                    ->state(fn (Listing $record) => Report::query()->open()->where('listing_id', $record->getKey())->distinct()->pluck('reason')
                        ->map(fn (string $r) => config("princess.moderation.report_reasons.$r") ?? $r)->all()),
                TextColumn::make('status')->badge()->formatStateUsing(fn ($state) => $state->value),
                TextColumn::make('title')->limit(50),
            ])
            ->recordActions([ViewAction::make()->label('Look')])
            ->emptyStateHeading('No open reports');
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
            'index' => ListReportedListings::route('/'),
            'view' => ViewReportedListing::route('/{record}'),
        ];
    }
}
