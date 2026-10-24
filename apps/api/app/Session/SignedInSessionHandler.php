<?php

namespace App\Session;

use Illuminate\Contracts\Container\Container;
use Illuminate\Cookie\CookieJar;
use Illuminate\Session\CookieSessionHandler;
use Illuminate\Session\DatabaseSessionHandler;

/**
 * The session driver "signed-in": nothing about a visitor is kept on the server until she signs in.
 *
 * A visitor who is not signed in (she opened the form, or sends a report) still has a session,
 * because the CSRF token lives in it; it is kept in an encrypted cookie on her own device, as
 * Laravel's cookie driver does. Once a guard holds someone (a site account or a moderator), the
 * session moves to the sessions table, where it can be ended from the server: on sign-out, on a
 * password reset, on account deletion. Signing out moves her back to a cookie.
 *
 * It extends the cookie handler so that the session store hands it the request, which the cookie
 * half reads the session from.
 */
final class SignedInSessionHandler extends CookieSessionHandler
{
    /** Whether the session read this request came from the sessions table. */
    private bool $inDatabase = false;

    public function __construct(
        CookieJar $cookie,
        int $minutes,
        bool $expireOnClose,
        private readonly DatabaseSessionHandler $database,
        private readonly Container $container,
    ) {
        parent::__construct($cookie, $minutes, $expireOnClose);
    }

    public function read($sessionId): string|false
    {
        $data = $this->database->read($sessionId);
        $this->inDatabase = $data !== '' && $data !== false;

        return $this->inDatabase ? $data : parent::read($sessionId);
    }

    public function write($sessionId, $data): bool
    {
        if ($this->someoneIsSignedIn()) {
            if ($this->request?->cookies->has($sessionId)) {
                parent::destroy($sessionId);
            }

            return $this->database->write($sessionId, $data);
        }
        if ($this->inDatabase) {
            $this->database->destroy($sessionId);
            $this->inDatabase = false;
        }

        return parent::write($sessionId, $data);
    }

    public function destroy($sessionId): bool
    {
        $this->database->destroy($sessionId);
        $this->inDatabase = false;

        return parent::destroy($sessionId);
    }

    public function gc($lifetime): int
    {
        return $this->database->gc($lifetime);
    }

    /** A session guard keeps whoever it signed in under a "login_<guard>_…" key. */
    private function someoneIsSignedIn(): bool
    {
        foreach (array_keys($this->container->make('session.store')->all()) as $key) {
            if (str_starts_with((string) $key, 'login_')) {
                return true;
            }
        }

        return false;
    }
}
