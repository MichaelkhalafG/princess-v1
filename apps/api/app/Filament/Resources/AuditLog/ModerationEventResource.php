<?php

namespace App\Filament\Resources\AuditLog;

use App\Filament\Resources\AuditLog\Pages\ListModerationEvents;
use App\Filament\Support\Labels;
use App\Models\ModerationEvent;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;

/** Every decision, newest first. Read only: nobody edits the record of what was decided. */
class ModerationEventResource extends Resource
{
    protected static ?string $model = ModerationEvent::class;

    protected static ?string $slug = 'audit';

    protected static ?string $navigationLabel = 'Audit log';

    protected static ?string $modelLabel = 'decision';

    protected static ?int $navigationSort = 5;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedClipboardDocumentList;

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->columns([
                TextColumn::make('created_at')->label('When')->dateTime()->sortable(),
                TextColumn::make('moderator.email')->label('Who')->placeholder('Automatic'),
                TextColumn::make('action')->badge(),
                TextColumn::make('reason')->formatStateUsing(fn (?string $state) => Labels::reason($state))->placeholder('-'),
                TextColumn::make('listing.title')->label('Listing')->limit(40)->placeholder('-'),
                TextColumn::make('listing_id')->label('Listing id')->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('ban_id')->label('Ban')->placeholder('-')->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('action')->options(fn () => ModerationEvent::query()->distinct()->orderBy('action')->pluck('action', 'action')->all()),
            ]);
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
        return ['index' => ListModerationEvents::route('/')];
    }
}
