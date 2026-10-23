<?php

namespace App\Console\Commands;

use App\Enums\ListingStatus;
use App\Models\Photo;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Photos nobody needs any more, deleted with their files. Scheduled hourly.
 *   - uploaded but never claimed by a listing within unclaimed_hours;
 *   - on a rejected or removed listing, refused_days after the moderator's decision (the
 *     listing's text stays: a removal still counts against her trust).
 */
class PrunePhotos extends Command
{
    protected $signature = 'princess:prune-photos';

    protected $description = 'Delete unclaimed uploads and the photos of refused listings';

    public function handle(): int
    {
        $unclaimed = Photo::query()->whereNull('listing_id')
            ->where('created_at', '<', Carbon::now()->subHours(config('princess.photos.unclaimed_hours')));
        $refused = Photo::query()->whereHas('listing', fn ($q) => $q
            ->whereIn('status', [ListingStatus::Rejected, ListingStatus::Removed])
            ->where('reviewed_at', '<', Carbon::now()->subDays(config('princess.photos.refused_days'))));

        $deleted = 0;
        foreach ([$unclaimed, $refused] as $query) {
            $query->eachById(function (Photo $photo) use (&$deleted) {
                $photo->deleteWithFile();
                $deleted++;
            });
        }
        $this->info("Deleted {$deleted} photo(s).");

        return self::SUCCESS;
    }
}
