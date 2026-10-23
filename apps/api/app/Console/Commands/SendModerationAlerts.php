<?php

namespace App\Console\Commands;

use App\Enums\ListingStatus;
use App\Models\Listing;
use App\Models\Report;
use App\Notifications\ModerationAlert;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

/**
 * Tells the moderators what needs a look: reports that arrived since the last alert, and a queue
 * whose oldest listing has waited alert_backlog_hours (said at most once in that many hours).
 * One email to princess.moderation.alert_email; with none set, a line in the log. Scheduled hourly.
 */
class SendModerationAlerts extends Command
{
    protected $signature = 'princess:moderation-alerts';

    protected $description = 'Email the moderators about new reports and a waiting queue';

    /** The last report already told about. */
    private const REPORTS_SEEN = 'moderation-alerts:reports-seen';

    private const BACKLOG_SAID = 'moderation-alerts:backlog-said';

    public function handle(): int
    {
        $now = Carbon::now();
        $lines = [];

        // by id, not by time: a report in the same second as the last run is still new
        $seen = (int) Cache::get(self::REPORTS_SEEN, 0);
        $latest = (int) Report::query()->max('id');
        $newReports = Report::query()->where('id', '>', $seen)->where('id', '<=', $latest)->count();
        if ($newReports > 0) {
            $listings = Report::query()->open()->distinct()->count('listing_id');
            $lines[] = "{$newReports} new report(s). {$listings} listing(s) have open reports.";
        }

        $hours = config('princess.moderation.alert_backlog_hours');
        $oldest = Listing::query()->where('status', ListingStatus::Pending)->min('created_at');
        if ($oldest !== null && Carbon::parse($oldest)->lte($now->copy()->subHours($hours)) && ! Cache::has(self::BACKLOG_SAID)) {
            $waiting = Listing::query()->where('status', ListingStatus::Pending)->count();
            $lines[] = "{$waiting} listing(s) are waiting for review; the oldest since ".Carbon::parse($oldest)->toDayDateTimeString().' UTC.';
            Cache::put(self::BACKLOG_SAID, true, $now->copy()->addHours($hours));
        }

        Cache::forever(self::REPORTS_SEEN, $latest);

        if ($lines === []) {
            $this->info('Nothing to tell the moderators.');

            return self::SUCCESS;
        }
        $to = config('princess.moderation.alert_email');
        if ($to) {
            Notification::route('mail', $to)->notify(new ModerationAlert($lines));
            $this->info('Alert sent.');
        } else {
            Log::warning('Moderation alert (no MODERATION_ALERT_EMAIL set): '.implode(' ', $lines));
            $this->info('Alert logged (no address set).');
        }

        return self::SUCCESS;
    }
}
