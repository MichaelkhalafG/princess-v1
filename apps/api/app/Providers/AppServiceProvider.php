<?php

namespace App\Providers;

use App\Session\SignedInSessionHandler;
use App\Support\ClientKey;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull;
use Illuminate\Foundation\Http\Middleware\TrimStrings;
use Illuminate\Http\Request;
use Illuminate\Session\DatabaseSessionHandler;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\ServiceProvider;
use Laravel\Sanctum\PersonalAccessToken;
use Laravel\Sanctum\Sanctum;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // The API reads what she typed exactly as the web form does (App\Support\JsText): its own
        // trimming, with JavaScript's white space. Laravel's would trim a different set of
        // characters and turn "" into null before the rules see it.
        TrimStrings::skipWhen(fn (Request $request) => $request->is('api/*'));
        ConvertEmptyStringsToNull::skipWhen(fn (Request $request) => $request->is('api/*'));

        // SESSION_DRIVER=signed-in: no session row for anyone not signed in (the privacy page says so).
        Session::extend('signed-in', fn ($app) => new SignedInSessionHandler(
            $app->make('cookie'),
            (int) config('session.lifetime'),
            (bool) config('session.expire_on_close'),
            new DatabaseSessionHandler($app['db']->connection(config('session.connection')), config('session.table'), config('session.lifetime'), $app),
            $app,
        ));

        // The app's sign-in ends after princess.accounts.app_token_idle_days without use (the privacy
        // page says so). Sanctum's own expiration counts from the sign-in, not the last use.
        Sanctum::authenticateAccessTokensUsing(fn (PersonalAccessToken $token, bool $isValid) => $isValid
            && ($token->last_used_at ?? $token->created_at)->gt(now()->subDays(config('princess.accounts.app_token_idle_days'))));

        // The numbers are in config('princess.rate_limits'). Every key that comes from her address
        // (or an email) is a keyed hash (ClientKey): the cache holds neither.
        $limit = fn (string $name): int => config("princess.rate_limits.$name");

        // Signing up happens with a first listing; signed-in posting has its own daily limit.
        RateLimiter::for('new-accounts', fn (Request $request) => $request->user('sanctum')
            ? Limit::none()
            : Limit::perHour($limit('accounts_per_ip_per_hour'))->by(ClientKey::of('ip', (string) $request->ip())));

        // Password guessing: per account (or the email tried) and address.
        RateLimiter::for('login', function (Request $request) use ($limit) {
            $who = $request->user()?->getKey() ?? mb_strtolower((string) $request->input('email'));

            return Limit::perMinute($limit('logins_per_minute'))->by(ClientKey::of('login', (string) $who, (string) $request->ip()));
        });

        RateLimiter::for('reports', fn (Request $request) => Limit::perHour($limit('reports_per_ip_per_hour'))->by(ClientKey::of('ip', (string) $request->ip())));

        RateLimiter::for('photo-uploads', fn (Request $request) => Limit::perHour($limit('photo_uploads_per_ip_per_hour'))->by(ClientKey::of('ip', (string) $request->ip())));

        RateLimiter::for('password-emails', fn (Request $request) => Limit::perHour($limit('password_emails_per_ip_per_hour'))->by(ClientKey::of('ip', (string) $request->ip())));

        // One new link a minute, a few an hour (distinct keys, so the two limits count apart).
        RateLimiter::for('verification-emails', fn (Request $request) => [
            Limit::perMinute(1)->by('minute:'.$request->user()->getKey()),
            Limit::perHour($limit('verification_emails_per_hour'))->by('hour:'.$request->user()->getKey()),
        ]);
    }
}
