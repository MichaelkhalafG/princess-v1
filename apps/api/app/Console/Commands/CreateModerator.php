<?php

namespace App\Console\Commands;

use App\Models\Moderator;
use Illuminate\Console\Command;

/**
 * Adds a moderator, or sets a new password for one. The password is typed, never shown. The first
 * sign-in to the admin then asks her to set up an authenticator app.
 */
class CreateModerator extends Command
{
    protected $signature = 'princess:moderator {email : The moderator\'s email address} {--remove : Remove this moderator instead}';

    protected $description = 'Add a moderator to the admin, set a new password, or remove one';

    public function handle(): int
    {
        $email = mb_strtolower(trim((string) $this->argument('email')));
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('That is not an email address.');

            return self::FAILURE;
        }

        if ($this->option('remove')) {
            $removed = Moderator::query()->where('email', $email)->delete();
            $this->info($removed ? "Removed $email." : "There is no moderator $email.");

            return self::SUCCESS;
        }

        $password = (string) $this->secret('Password (at least 12 characters)');
        if (mb_strlen($password) < 12 || strlen($password) > 72) {
            $this->error('The password must be at least 12 characters (and at most 72 bytes).');

            return self::FAILURE;
        }
        if ($password !== (string) $this->secret('The same password again')) {
            $this->error('The two passwords differ.');

            return self::FAILURE;
        }

        $moderator = Moderator::query()->firstOrNew(['email' => $email]);
        $new = ! $moderator->exists;
        $moderator->password = $password;
        if (! $new) {
            // a new password also resets the authenticator app, so a lost phone can be replaced
            $moderator->app_authentication_secret = null;
            $moderator->app_authentication_recovery_codes = null;
        }
        $moderator->save();
        $this->info(($new ? 'Added' : 'New password for')." $email. Sign in at ".url('/admin').' and set up an authenticator app.');

        return self::SUCCESS;
    }
}
