<?php

namespace App\Console\Commands;

use App\Accounts\AccountDeletion;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/** Accounts whose email was never verified, deleted with everything that is theirs. Scheduled hourly. */
class PruneUnverifiedAccounts extends Command
{
    protected $signature = 'princess:prune-unverified';

    protected $description = 'Delete accounts that never verified their email, with their listings';

    public function handle(): int
    {
        $before = Carbon::now()->subDays(config('princess.accounts.unverified_days'));
        $deleted = 0;
        User::query()->whereNull('email_verified_at')->where('created_at', '<', $before)
            ->eachById(function (User $user) use (&$deleted) {
                AccountDeletion::run($user);
                $deleted++;
            });
        $this->info("Deleted {$deleted} unverified account(s) created before {$before->toIso8601ZuluString()}.");

        return self::SUCCESS;
    }
}
