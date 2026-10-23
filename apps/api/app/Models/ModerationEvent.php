<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One moderation decision, for the audit log. Written only by App\Moderation\Moderation. */
class ModerationEvent extends Model
{
    public const UPDATED_AT = null;

    protected $guarded = ['id'];

    public function moderator(): BelongsTo
    {
        return $this->belongsTo(Moderator::class);
    }

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
