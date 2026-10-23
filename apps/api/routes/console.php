<?php

use Illuminate\Support\Facades\Schedule;

// The host's cron runs "php artisan schedule:run" every minute; these run from it.

Schedule::command('princess:prune-unverified')->hourly();
Schedule::command('princess:prune-photos')->hourly();
