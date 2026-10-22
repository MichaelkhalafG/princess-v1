<?php

namespace App\Models;

use App\Enums\HeldFor;
use App\Enums\ListingStatus;
use App\Support\ArabicFold;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * @property string $id
 * @property ListingStatus $status
 */
class Listing extends Model
{
    use HasUuids;

    /** What the public can read about a listing, in this order. Nothing else ever leaves. */
    public const PUBLIC_FIELDS = [
        'id', 'name', 'title', 'category', 'country', 'city', 'district', 'description',
        'price', 'whatsapp', 'phone', 'social', 'published_at',
    ];

    protected $guarded = ['id', 'search_text'];

    protected function casts(): array
    {
        return [
            'status' => ListingStatus::class,
            'held_for' => HeldFor::class,
            'published_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        // search_text is always the fold of what she wrote, whoever saves the row.
        static::saving(function (Listing $listing) {
            $listing->search_text = ArabicFold::fold(implode(' ', [
                $listing->name, $listing->title, $listing->description, $listing->city, $listing->district ?? '',
            ]));
        });
    }

    /** Random (version 4) ids: a listing's address reveals nothing, not even when it was made. */
    public function newUniqueId(): string
    {
        return (string) Str::uuid();
    }

    /**
     * The listing as the public sees it: PUBLIC_FIELDS and its photo, nothing else.
     *
     * @return array<string, mixed>
     */
    public function toPublic(): array
    {
        $out = [];
        foreach (self::PUBLIC_FIELDS as $field) {
            $out[$field] = $this->getAttribute($field);
        }
        $out['published_at'] = $this->published_at?->toIso8601ZuluString();
        $out['photo'] = null; // photos arrive with the photo pipeline

        return $out;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @param Builder<Listing> $query */
    public function scopePublished(Builder $query): void
    {
        $query->where('status', ListingStatus::Published);
    }

    /** Newest on the board first; the id breaks ties so a page never reshuffles. */
    public function scopeBoardOrder(Builder $query): void
    {
        $query->orderByDesc('published_at')->orderBy('id');
    }
}
