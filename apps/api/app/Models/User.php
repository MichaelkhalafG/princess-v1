<?php

namespace App\Models;

use App\Enums\ListingStatus;
use App\Notifications\ResetPasswordEmail;
use App\Notifications\VerifyEmail;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * An account: an email and a password. The email is never shown to anyone; her name and her
 * contacts belong to each listing.
 */
#[Fillable(['email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    use HasApiTokens, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function listings(): HasMany
    {
        return $this->hasMany(Listing::class);
    }

    /**
     * Trusted: a moderator has approved one of her listings, and has removed none of them
     * since. A rejected first listing earns nothing; a removal sends her back to review until
     * a moderator approves another.
     */
    public function isTrusted(): bool
    {
        $approved = $this->listings()->where('status', ListingStatus::Published)->whereNotNull('reviewed_at')->max('reviewed_at');
        if ($approved === null) {
            return false;
        }
        $removed = $this->listings()->where('status', ListingStatus::Removed)->max('reviewed_at');

        return $removed === null || $removed < $approved;
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmail);
    }

    /** @param string $token */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordEmail($token));
    }
}
