<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One thing that may not post (an account, a number, an Instagram handle), until a moderator lifts it. */
class Ban extends Model
{
    public const ACCOUNT = 'account';

    public const NUMBER = 'number';

    public const INSTAGRAM = 'instagram';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['lifted_at' => 'datetime'];
    }

    /** @param Builder<Ban> $query */
    public function scopeActive(Builder $query): void
    {
        $query->whereNull('lifted_at');
    }

    /** The value as it is stored and compared: numbers as E.164, handles in lower case. */
    public static function normalize(string $kind, string $value): string
    {
        return $kind === self::INSTAGRAM ? mb_strtolower(ltrim(trim($value), '@')) : trim($value);
    }

    public static function accountIsBanned(User $user): bool
    {
        return self::query()->active()->where('kind', self::ACCOUNT)->where('value', (string) $user->getKey())->exists();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Moderator::class, 'created_by');
    }
}
