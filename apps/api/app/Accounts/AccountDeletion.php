<?php

namespace App\Accounts;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Removes an account and everything that is hers. Used when she deletes her account and when an
 * unverified account expires. Her listings go with the account (the foreign key cascades).
 */
final class AccountDeletion
{
    public static function run(User $user): void
    {
        DB::transaction(function () use ($user) {
            $user->tokens()->delete();
            DB::table('sessions')->where('user_id', $user->getKey())->delete();
            DB::table('password_reset_tokens')->where('email', $user->email)->delete();
            $user->delete();
        });
    }
}
