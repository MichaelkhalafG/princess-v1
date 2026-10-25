<?php

namespace App\Accounts;

use App\Models\User;

/**
 * A sign-up on an email whose account was never verified replaces that account: the old one goes,
 * with its unverified listing and photos (nothing carries over), and the new sign-up gets its own
 * fresh verification link. Without this, a woman who gave up once was told her own email was
 * taken when she came back, and anyone could hold an address for a week by signing it up first.
 * A verified account is never replaced: its email stays taken (AccountInput).
 */
final class UnverifiedAccount
{
    public static function clearFor(mixed $email): void
    {
        $old = User::query()->where('email', AccountInput::email($email))->whereNull('email_verified_at')->first();
        if ($old !== null) {
            AccountDeletion::run($old);
        }
    }
}
