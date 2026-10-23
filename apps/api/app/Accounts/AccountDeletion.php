<?php

namespace App\Accounts;

use App\Models\Photo;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Removes an account and everything that is hers. Used when she deletes her account and when an
 * unverified account expires. Her listings and photo rows go with the account (the foreign keys
 * cascade); her photo files are deleted here, once the rows are gone.
 */
final class AccountDeletion
{
    public static function run(User $user): void
    {
        // every photo of hers: uploaded while signed in, or on one of her listings
        $photos = Photo::query()
            ->where('user_id', $user->getKey())
            ->orWhereIn('listing_id', $user->listings()->select('id'))
            ->get(['id', 'visibility']);

        DB::transaction(function () use ($user, $photos) {
            Photo::query()->whereKey($photos->modelKeys())->delete();
            $user->tokens()->delete();
            DB::table('sessions')->where('user_id', $user->getKey())->delete();
            DB::table('password_reset_tokens')->where('email', $user->email)->delete();
            $user->delete();
        });

        foreach ($photos as $photo) {
            Photo::disk($photo->visibility)->delete($photo->fileName());
        }
    }
}
