<?php

namespace Tests\Feature;

use App\Enums\HeldFor;
use App\Enums\ListingStatus;
use App\Models\Listing;
use App\Models\User;
use App\Notifications\ResetPasswordEmail;
use App\Notifications\VerifyEmail;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;
use Tests\Unit\ListingCasesTest;

// Accounts: signing up at the end of the form, verifying, signing in and out, a new password,
// deleting everything, and the cleanup of accounts never verified. The app's way (tokens) is
// tested here; the web's way (a session cookie) is the same code behind Sanctum.
class AccountsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
    }

    /** @return array<string, mixed> */
    private function signUpBody(array $over = []): array
    {
        return [...ListingCasesTest::caseFile()['base'], 'email' => 'new.poster@example.test', 'password' => 'a-good-password', 'device_name' => 'test phone', ...$over];
    }

    /** The link in the verification email sent to $user, as the API route the web app calls. */
    private function verificationApiUrl(User $user): string
    {
        $url = null;
        Notification::assertSentTo($user, VerifyEmail::class, function (VerifyEmail $n) use ($user, &$url) {
            $url = $n->toMail($user)->viewData['url'];

            return true;
        });
        $this->assertStringStartsWith(config('princess.web_url').'/verify-email?', $url);
        parse_str(parse_url($url, PHP_URL_QUERY), $q);

        return "/api/v1/email/verify/{$q['id']}/{$q['hash']}?".http_build_query(['expires' => $q['expires'], 'signature' => $q['signature']]);
    }

    /** Forget who the last request signed in as, so the next one is judged on its own token. */
    private function freshRequest(): void
    {
        $this->app['auth']->forgetGuards();
    }

    // ── Signing up at the end of the form ──────────────────────────────────────────────

    public function test_signing_up_creates_the_account_and_the_listing_which_waits_unseen_for_the_email(): void
    {
        $res = $this->postJson('/api/v1/listings', $this->signUpBody(['email' => '  New.Poster@Example.TEST '.mb_chr(0xA0)]))->assertCreated();
        $this->assertSame('unverified', $res->json('status'));
        $this->assertNotEmpty($res->json('token'));

        $user = User::query()->sole();
        $this->assertSame('new.poster@example.test', $user->email, 'trimmed and in lower case');
        $this->assertFalse($user->hasVerifiedEmail());
        $listing = Listing::query()->sole();
        $this->assertSame($user->id, $listing->user_id);
        $this->assertSame(ListingStatus::Unverified, $listing->status);
        $this->getJson("/api/v1/listings/{$listing->id}")->assertNotFound();
        Notification::assertSentToTimes($user, VerifyEmail::class, 1);

        // the token she was given is hers
        $this->freshRequest();
        $this->withToken($res->json('token'))->getJson('/api/v1/me')
            ->assertOk()->assertExactJson(['email' => 'new.poster@example.test', 'verified' => false]);
    }

    public function test_the_link_in_the_email_verifies_her_and_sends_the_listing_to_review(): void
    {
        config(['princess.moderation.launch_phase' => false]);
        $this->postJson('/api/v1/listings', $this->signUpBody())->assertCreated();
        $user = User::query()->sole();

        $res = $this->getJson($this->verificationApiUrl($user))->assertOk();
        $listing = Listing::query()->sole();
        $this->assertSame(['verified' => true, 'listings' => [['id' => $listing->id, 'status' => 'pending']]], $res->json());
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
        $this->assertSame(HeldFor::FirstListing, $listing->held_for, 'a new account is never trusted');

        // the same link again changes nothing
        $this->getJson($this->verificationApiUrl($user))->assertOk()->assertJsonPath('listings.0.status', 'pending');
    }

    public function test_a_link_works_unchanged_for_24_hours_and_not_after(): void
    {
        $this->postJson('/api/v1/listings', $this->signUpBody())->assertCreated();
        $user = User::query()->sole();
        $url = $this->verificationApiUrl($user);
        $hours = config('princess.accounts.verification_link_hours');

        $this->getJson(str_replace('signature=', 'signature=0', $url))->assertForbidden()->assertExactJson(['error' => 'link_invalid']);
        $this->getJson(preg_replace('/expires=\d+/', 'expires=9999999999', $url))->assertForbidden()->assertExactJson(['error' => 'link_invalid']);

        $this->travel($hours * 60 + 1)->minutes();
        $this->getJson($url)->assertForbidden()->assertExactJson(['error' => 'link_expired']);
        $this->travelBack();

        $this->travel($hours * 60 - 1)->minutes();
        $this->getJson($url)->assertOk();
    }

    public function test_a_correctly_signed_link_for_another_address_or_a_deleted_account_verifies_nothing(): void
    {
        $user = $this->makeUser(verified: false);
        $signed = fn (int $id, string $email) => URL::temporarySignedRoute('verification.verify', Carbon::now()->addHour(), ['id' => $id, 'hash' => sha1($email)], absolute: false);

        $this->getJson($signed($user->id, 'someone.else@example.test'))->assertForbidden()->assertExactJson(['error' => 'link_invalid']);
        $this->getJson($signed($user->id + 1000, $user->email))->assertForbidden()->assertExactJson(['error' => 'link_invalid']);
        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_an_address_with_an_account_cannot_sign_up_again_and_nothing_is_created(): void
    {
        $existing = $this->makeUser();
        $res = $this->postJson('/api/v1/listings', $this->signUpBody(['email' => strtoupper($existing->email)]));

        $res->assertStatus(422)->assertExactJson(['errors' => ['email' => 'taken']]);
        $this->assertSame(1, User::count());
        $this->assertSame(0, Listing::count());
        Notification::assertNothingSent();
    }

    public function test_listing_and_account_errors_come_back_together(): void
    {
        $res = $this->postJson('/api/v1/listings', $this->signUpBody(['name' => '', 'email' => 'not-an-address', 'password' => 'short']));

        $res->assertStatus(422)->assertExactJson(['errors' => ['name' => 'required', 'email' => 'invalid', 'password' => 'too_short']]);
        $this->assertSame(0, User::count());
        $this->assertSame(0, Listing::count());
    }

    public function test_password_rules_count_characters_for_the_minimum_and_bytes_for_the_maximum(): void
    {
        $min = config('princess.accounts.password_min_chars');
        $maxBytes = config('princess.accounts.password_max_bytes');
        $errorsFor = fn (mixed $password) => $this->postJson('/api/v1/listings', $this->signUpBody(['password' => $password]))->json('errors.password');

        $this->assertSame('required', $errorsFor(null));
        $this->assertSame('invalid', $errorsFor(12345678));
        $this->assertSame('too_short', $errorsFor(str_repeat('ب', $min - 1)));
        $this->assertSame('too_long', $errorsFor(str_repeat('ب', intdiv($maxBytes, 2) + 1)), 'Arabic letters are two bytes each');
        $this->assertNull($errorsFor(str_repeat('ب', intdiv($maxBytes, 2))), 'exactly the byte limit is allowed');
        $this->assertSame(1, User::count());
    }

    public function test_signed_in_her_email_and_password_fields_are_ignored(): void
    {
        $this->signIn($user = $this->makeUser());
        $id = $this->postJson('/api/v1/listings', $this->signUpBody(['email' => 'other@example.test']))->assertCreated()->json('id');

        $this->assertSame(1, User::count());
        $this->assertSame($user->id, Listing::query()->findOrFail($id)->user_id);
    }

    public function test_one_address_signs_up_at_most_ten_accounts_an_hour(): void
    {
        $limit = config('princess.rate_limits.accounts_per_ip_per_hour');
        foreach (range(1, $limit) as $i) {
            $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])
                ->postJson('/api/v1/listings', $this->signUpBody(['email' => "p{$i}@example.test"]))->assertCreated();
            $this->freshRequest();
        }
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.10'])
            ->postJson('/api/v1/listings', $this->signUpBody(['email' => 'one.more@example.test']))
            ->assertStatus(429)->assertJsonPath('error', 'too_many_attempts');
        $this->withServerVariables(['REMOTE_ADDR' => '203.0.113.11'])
            ->postJson('/api/v1/listings', $this->signUpBody(['email' => 'elsewhere@example.test']))->assertCreated();
        $this->assertSame($limit + 1, User::count());
    }

    // ── A new link ─────────────────────────────────────────────────────────────────────

    public function test_a_new_link_needs_her_signed_in_and_comes_at_most_once_a_minute(): void
    {
        $this->postJson('/api/v1/email/resend')->assertUnauthorized()->assertExactJson(['error' => 'unauthenticated']);

        $this->signIn($user = $this->makeUser(verified: false));
        $this->postJson('/api/v1/email/resend')->assertStatus(202);
        $this->postJson('/api/v1/email/resend')->assertStatus(429);
        $this->travel(61)->seconds();
        $this->postJson('/api/v1/email/resend')->assertStatus(202);
        Notification::assertSentToTimes($user, VerifyEmail::class, 2);

        $this->signIn($verified = $this->makeUser());
        $this->postJson('/api/v1/email/resend')->assertOk()->assertExactJson(['verified' => true]);
        Notification::assertNotSentTo($verified, VerifyEmail::class);
    }

    // ── Signing in and out ──────────────────────────────────────────────────────────────

    public function test_signing_in_gives_the_app_a_token_that_ends_when_she_signs_out(): void
    {
        $user = $this->makeUser();
        $wrong = $this->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'not-it'])->assertStatus(422);
        $unknown = $this->postJson('/api/v1/login', ['email' => 'nobody@example.test', 'password' => 'test-password'])->assertStatus(422);
        $this->assertSame(['errors' => ['email' => 'wrong_credentials']], $wrong->json());
        $this->assertSame($wrong->json(), $unknown->json(), 'an unknown address and a wrong password answer alike');
        $this->postJson('/api/v1/login', [])->assertStatus(422)->assertExactJson(['errors' => ['email' => 'required', 'password' => 'required']]);

        $token = $this->postJson('/api/v1/login', ['email' => strtoupper($user->email), 'password' => 'test-password', 'device_name' => 'test phone'])
            ->assertOk()->assertJsonPath('email', $user->email)->json('token');
        $this->freshRequest();
        $this->withToken($token)->getJson('/api/v1/me')->assertOk();
        $this->freshRequest();
        $this->withToken($token)->postJson('/api/v1/logout')->assertNoContent();
        $this->freshRequest();
        $this->withToken($token)->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_five_wrong_passwords_a_minute_then_she_must_wait(): void
    {
        $user = $this->makeUser();
        foreach (range(1, config('princess.rate_limits.logins_per_minute')) as $i) {
            $this->postJson('/api/v1/login', ['email' => $user->email, 'password' => "wrong-$i"])->assertStatus(422);
        }
        $this->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'test-password'])
            ->assertStatus(429)->assertJsonPath('error', 'too_many_attempts');
    }

    // ── A new password ──────────────────────────────────────────────────────────────────

    public function test_a_reset_link_sets_a_new_password_and_ends_every_sign_in(): void
    {
        $user = $this->makeUser();
        $oldToken = $user->createToken('old phone')->plainTextToken;

        $this->postJson('/api/v1/password/forgot', ['email' => ' '.strtoupper($user->email)])->assertStatus(202);
        $url = null;
        Notification::assertSentTo($user, ResetPasswordEmail::class, function (ResetPasswordEmail $n) use ($user, &$url) {
            $url = $n->toMail($user)->viewData['url'];

            return true;
        });
        $this->assertStringStartsWith(config('princess.web_url').'/reset-password?', $url);
        parse_str(parse_url($url, PHP_URL_QUERY), $q);
        $this->assertSame($user->email, $q['email']);

        $this->postJson('/api/v1/password/reset', ['token' => 'not-the-token', 'email' => $q['email'], 'password' => 'a-new-password'])
            ->assertStatus(422)->assertExactJson(['errors' => ['token' => 'invalid']]);
        $this->postJson('/api/v1/password/reset', ['token' => $q['token'], 'email' => $q['email'], 'password' => 'short'])
            ->assertStatus(422)->assertExactJson(['errors' => ['password' => 'too_short']]);
        $this->postJson('/api/v1/password/reset', ['token' => $q['token'], 'email' => $q['email'], 'password' => 'a-new-password'])
            ->assertOk();

        $this->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'test-password'])->assertStatus(422);
        $this->postJson('/api/v1/login', ['email' => $user->email, 'password' => 'a-new-password'])->assertOk();
        $this->freshRequest();
        $this->withToken($oldToken)->getJson('/api/v1/me')->assertUnauthorized();
    }

    public function test_asking_for_a_reset_answers_alike_whether_or_not_the_address_has_an_account(): void
    {
        $this->postJson('/api/v1/password/forgot', ['email' => 'nobody@example.test'])->assertStatus(202)->assertExactJson(['sent' => true]);
        Notification::assertNothingSent();
    }

    // ── Her listings, and deleting everything ───────────────────────────────────────────

    public function test_she_sees_all_her_listings_in_every_state_and_nobody_else_s(): void
    {
        $user = $this->makeUser();
        $now = Carbon::now();
        $pending = $this->makeListing(['user_id' => $user->id, 'status' => ListingStatus::Pending, 'published_at' => null, 'created_at' => $now->copy()->subHour()]);
        $rejected = $this->makeListing(['user_id' => $user->id, 'status' => ListingStatus::Rejected, 'published_at' => null, 'reject_reason' => 'off_topic', 'created_at' => $now]);
        $this->makeListing();

        $this->signIn($user);
        $items = $this->getJson('/api/v1/me/listings')->assertOk()->json('items');
        $this->assertSame([$rejected->id, $pending->id], array_column($items, 'id'));
        $this->assertSame(['rejected', 'pending'], array_column($items, 'status'));
        $this->assertSame('off_topic', $items[0]['reject_reason']);
    }

    public function test_deleting_her_account_takes_everything_of_hers_and_nothing_else(): void
    {
        $user = $this->makeUser();
        $mine = [
            $this->makeListing(['user_id' => $user->id]),
            $this->makeListing(['user_id' => $user->id, 'status' => ListingStatus::Pending, 'published_at' => null]),
        ];
        $user->createToken('another phone');
        $theirs = $this->makeListing();

        $this->signIn($user);
        $this->deleteJson('/api/v1/me', ['password' => 'not-it'])->assertStatus(422)->assertExactJson(['errors' => ['password' => 'wrong_password']]);
        $this->deleteJson('/api/v1/me', [])->assertStatus(422)->assertExactJson(['errors' => ['password' => 'required']]);
        $this->assertNotNull($user->fresh());

        $this->deleteJson('/api/v1/me', ['password' => 'test-password'])->assertNoContent();
        $this->assertNull($user->fresh());
        foreach ($mine as $listing) {
            $this->assertNull(Listing::query()->find($listing->id));
        }
        $this->getJson("/api/v1/listings/{$mine[0]->id}")->assertNotFound();
        $this->assertSame(0, DB::table('personal_access_tokens')->where('tokenable_id', $user->id)->count());
        $this->getJson("/api/v1/listings/{$theirs->id}")->assertOk();
    }

    public function test_deleting_needs_her_signed_in(): void
    {
        $this->deleteJson('/api/v1/me', ['password' => 'test-password'])->assertUnauthorized();
    }

    // ── Accounts never verified ─────────────────────────────────────────────────────────

    public function test_an_account_never_verified_is_deleted_after_seven_days_with_its_listing(): void
    {
        $days = config('princess.accounts.unverified_days');
        $now = Carbon::now()->startOfSecond();
        $expired = $this->makeUser(verified: false);
        $expired->forceFill(['created_at' => $now->copy()->subDays($days)->subMinute()])->save();
        $expiredListing = $this->makeListing(['user_id' => $expired->id, 'status' => ListingStatus::Unverified, 'published_at' => null]);
        $recent = $this->makeUser(verified: false);
        $recent->forceFill(['created_at' => $now->copy()->subDays($days)->addMinute()])->save();
        $oldButVerified = $this->makeUser();
        $oldButVerified->forceFill(['created_at' => $now->copy()->subDays($days * 10)])->save();

        $this->assertSame(0, $this->artisan('princess:prune-unverified'));

        $this->assertNull($expired->fresh());
        $this->assertNull(Listing::query()->find($expiredListing->id));
        $this->assertNotNull($recent->fresh());
        $this->assertNotNull($oldButVerified->fresh());
    }

    public function test_the_cleanup_runs_every_hour(): void
    {
        $events = collect(app(Schedule::class)->events())
            ->filter(fn ($event) => str_contains((string) $event->command, 'princess:prune-unverified'));
        $this->assertCount(1, $events);
        $this->assertSame('0 * * * *', $events->first()->expression);
    }
}
