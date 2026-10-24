<?php

namespace App\Providers\Filament;

use Filament\Auth\MultiFactor\App\AppAuthentication;
use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\AuthenticateSession;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Pages\Dashboard;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

/**
 * The moderators' admin at /admin: the review queue, reports, live listings, bans and the audit
 * log. Moderators (not users) sign in with a password and an authenticator app, which is
 * required: the first sign-in asks for it to be set up.
 */
class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->brandName('Princess moderation')
            ->authGuard('moderator')
            ->login()
            ->multiFactorAuthentication([AppAuthentication::make()->recoverable()], isRequired: true)
            ->colors([
                'primary' => Color::Rose,
                // Approve in white on a deep green, like Reject's white on red: on Filament's own
                // green it gets dark text on a bright fill. 7.1:1, and 4.9:1 on hover.
                'success' => self::darker(Color::Green, steps: 2),
            ])
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\Filament\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\Filament\Pages')
            ->pages([Dashboard::class])
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\Filament\Widgets')
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                PreventRequestForgery::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ]);
    }

    /**
     * The palette with every shade taken from that many shades darker (the darkest repeats).
     *
     * @param  array<int, string>  $palette
     * @return array<int, string>
     */
    private static function darker(array $palette, int $steps): array
    {
        $shades = array_keys($palette);
        $last = count($shades) - 1;
        $out = [];
        foreach ($shades as $i => $shade) {
            $out[$shade] = $palette[$shades[min($i + $steps, $last)]];
        }

        return $out;
    }
}
