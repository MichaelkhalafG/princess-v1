<?php

namespace App\Models;

use Filament\Auth\MultiFactor\App\Concerns\InteractsWithAppAuthentication;
use Filament\Auth\MultiFactor\App\Concerns\InteractsWithAppAuthenticationRecovery;
use Filament\Auth\MultiFactor\App\Contracts\HasAppAuthentication;
use Filament\Auth\MultiFactor\App\Contracts\HasAppAuthenticationRecovery;
use Filament\Models\Contracts\FilamentUser;
use Filament\Models\Contracts\HasName;
use Filament\Panel;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Foundation\Auth\User as Authenticatable;

/** Someone who reviews listings in the admin. Created with `php artisan princess:moderator`. */
#[Fillable(['email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class Moderator extends Authenticatable implements FilamentUser, HasAppAuthentication, HasAppAuthenticationRecovery, HasName
{
    use InteractsWithAppAuthentication, InteractsWithAppAuthenticationRecovery;

    protected function casts(): array
    {
        return ['password' => 'hashed'];
    }

    public function canAccessPanel(Panel $panel): bool
    {
        return true;
    }

    public function getAppAuthenticationHolderName(): string
    {
        return $this->email;
    }

    /** A moderator has no name here, only an email. */
    public function getFilamentName(): string
    {
        return $this->email;
    }
}
