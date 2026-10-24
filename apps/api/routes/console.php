<?php

use Illuminate\Support\Facades\Schedule;

// The host's cron runs "php artisan schedule:run" every minute; these run from it.

Schedule::command('princess:prune-unverified')->hourly();
Schedule::command('princess:prune-photos')->hourly();
Schedule::command('princess:moderation-alerts')->hourly();
// keeps the privacy page's deletion times true (rate limits within 24 hours, sessions once ended)
Schedule::command('princess:prune-expired')->everyTenMinutes();
