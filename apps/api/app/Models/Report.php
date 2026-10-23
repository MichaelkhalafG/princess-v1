<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** A visitor's report on a listing. Anonymous: nothing about who sent it is stored. */
class Report extends Model
{
    public const UPDATED_AT = null;

    public const OPEN = 'open';

    public const DISMISSED = 'dismissed';

    /** The listing was removed (or refused) because of it. */
    public const ACTIONED = 'actioned';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['handled_at' => 'datetime'];
    }

    /** @param Builder<Report> $query */
    public function scopeOpen(Builder $query): void
    {
        $query->where('status', self::OPEN);
    }

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }
}
