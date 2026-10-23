<?php

namespace App\Filament\Resources\Bans;

use App\Filament\Resources\Bans\Pages\CreateBan;
use App\Filament\Resources\Bans\Pages\ListBans;
use App\Filament\Support\Labels;
use App\Models\Ban;
use App\Models\Moderator;
use App\Moderation\Moderation;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Facades\Filament;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Model;

/** Who and what may not post: accounts, numbers, Instagram handles. Lift a ban here. */
class BanResource extends Resource
{
    protected static ?string $model = Ban::class;

    protected static ?string $slug = 'bans';

    protected static ?int $navigationSort = 4;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedNoSymbol;

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            Select::make('kind')->options([Ban::NUMBER => 'Phone or WhatsApp number', Ban::INSTAGRAM => 'Instagram handle'])->required(),
            TextInput::make('value')->label('Number (E.164, e.g. +201012345678) or handle')->required()->maxLength(64)
                ->rule(fn ($get) => $get('kind') === Ban::NUMBER ? 'regex:/^\+[1-9][0-9]{6,14}$/' : 'regex:/^@?[A-Za-z0-9._]{1,30}$/'),
            Select::make('reason')->options(Labels::reasons())->required(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->columns([
                TextColumn::make('kind')->badge(),
                TextColumn::make('value')->searchable(),
                TextColumn::make('reason')->formatStateUsing(fn (?string $state) => Labels::reason($state)),
                TextColumn::make('creator.email')->label('By')->placeholder('-'),
                TextColumn::make('created_at')->label('Since')->dateTime(),
                TextColumn::make('lifted_at')->label('Lifted')->dateTime()->placeholder('Active'),
            ])
            ->filters([
                TernaryFilter::make('active')->queries(
                    true: fn ($q) => $q->whereNull('lifted_at'),
                    false: fn ($q) => $q->whereNotNull('lifted_at'),
                )->default(true),
            ])
            ->recordActions([
                Action::make('lift')->label('Lift')->color('gray')->requiresConfirmation()
                    ->visible(fn (Ban $record) => $record->lifted_at === null)
                    ->action(function (Ban $record) {
                        /** @var Moderator $moderator */
                        $moderator = Filament::auth()->user();
                        Moderation::lift($record, $moderator);
                    }),
            ]);
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
            'index' => ListBans::route('/'),
            'create' => CreateBan::route('/create'),
        ];
    }
}
