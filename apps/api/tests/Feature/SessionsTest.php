<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

// The session driver "signed-in" (App\Session\SignedInSessionHandler), as the website uses the API:
// from the site's own origin, with cookies carried from one request to the next like a browser.
// The privacy page says nothing about a visitor is kept on the server before she signs in.
class SessionsTest extends TestCase
{
    use RefreshDatabase;

    private const SITE = 'http://localhost:3000';

    /** @var array<string, string> the browser's cookies for the API, as the API sent them */
    private array $jar = [];

    protected function setUp(): void
    {
        parent::setUp();
        config(['session.driver' => 'signed-in', 'sanctum.stateful' => ['localhost:3000']]);
    }

    /** One request from the website, cookies in and out as a browser would carry them. */
    private function browse(string $method, string $uri, array $data = []): TestResponse
    {
        $headers = ['Origin' => self::SITE, 'Referer' => self::SITE.'/new'];
        if (isset($this->jar['XSRF-TOKEN'])) {
            $headers['X-XSRF-TOKEN'] = $this->jar['XSRF-TOKEN'];
        }
        $response = $this->withCredentials()->withUnencryptedCookies($this->jar)->withHeaders($headers)->json($method, $uri, $data);
        foreach ($response->headers->getCookies() as $cookie) {
            if ($cookie->isCleared()) {
                unset($this->jar[$cookie->getName()]);
            } else {
                $this->jar[$cookie->getName()] = (string) $cookie->getValue();
            }
        }
        $this->flushHeaders();
        // the next request starts clean, as each does on the server: no queued cookie, no user
        // remembered by a guard from this one
        $this->app['cookie']->flushQueuedCookies();
        $this->app['auth']->forgetGuards();

        return $response;
    }

    private function sessionRows(): int
    {
        return DB::table('sessions')->count();
    }

    public function test_a_visitor_who_is_not_signed_in_leaves_no_session_row(): void
    {
        $this->browse('GET', '/sanctum/csrf-cookie')->assertNoContent();
        $this->browse('GET', '/api/v1/me')->assertUnauthorized();
        $this->assertSame(0, $this->sessionRows());
        // her session is a cookie on her own device instead: the session id, and the data in a
        // cookie named after it (40 characters)
        $this->assertArrayHasKey(config('session.cookie'), $this->jar);
        $this->assertCount(1, array_filter(array_keys($this->jar), fn ($name) => strlen($name) === 40));
    }

    // (Laravel skips the CSRF check under PHPUnit, so the token's refusal is not provable here.)
    public function test_a_form_sent_signed_out_leaves_no_session_row(): void
    {
        $listing = $this->makeListing();
        $this->browse('GET', '/sanctum/csrf-cookie');
        $this->browse('POST', "/api/v1/listings/{$listing->id}/reports", ['reason' => 'spam'])->assertStatus(202);
        $this->assertSame(0, $this->sessionRows());
    }

    public function test_signing_in_keeps_a_session_row_and_signing_out_removes_it(): void
    {
        $user = $this->makeUser();
        $this->browse('GET', '/sanctum/csrf-cookie');
        $this->browse('POST', '/api/v1/login', ['email' => $user->email, 'password' => 'test-password'])->assertOk();

        $row = DB::table('sessions')->sole();
        $this->assertSame($user->id, $row->user_id);
        $this->browse('GET', '/api/v1/me')->assertOk()->assertJsonPath('email', $user->email);

        $this->browse('POST', '/api/v1/logout')->assertNoContent();
        $this->assertSame(0, $this->sessionRows());
        $this->browse('GET', '/api/v1/me')->assertUnauthorized();
        $this->assertSame(0, $this->sessionRows());
    }

    public function test_an_ended_session_is_deleted_by_the_prune(): void
    {
        $user = $this->makeUser();
        $this->browse('GET', '/sanctum/csrf-cookie');
        $this->browse('POST', '/api/v1/login', ['email' => $user->email, 'password' => 'test-password'])->assertOk();

        $this->travel(config('session.lifetime') - 1)->minutes();
        $this->artisan('princess:prune-expired');
        $this->assertSame(1, $this->sessionRows(), 'still within its lifetime');

        $this->travel(2)->minutes();
        $this->artisan('princess:prune-expired');
        $this->assertSame(0, $this->sessionRows());
    }
}
