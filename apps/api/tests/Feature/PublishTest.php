<?php

namespace Tests\Feature;

use App\Enums\HeldFor;
use App\Enums\ListingStatus;
use App\Models\Listing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;
use Tests\Unit\ListingCasesTest;

// Posting a listing while signed in: the shared cases through the endpoint, where line B sends
// each listing, and the daily limit. Every account and listing asserted on is built here.
class PublishTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, mixed> */
    private function validBody(): array
    {
        return ListingCasesTest::caseFile()['base'];
    }

    /** @return iterable<string, array{array<string, mixed>}> */
    public static function cases(): iterable
    {
        return ListingCasesTest::cases();
    }

    /** @param array<string, mixed> $case */
    #[DataProvider('cases')]
    public function test_the_shared_case_through_the_endpoint(array $case): void
    {
        $this->signIn($user = $this->makeUser());
        $res = $this->postJson('/api/v1/listings', ListingCasesTest::inputOf($case));

        if ($case['ok']) {
            $res->assertCreated();
            $stored = Listing::query()->findOrFail($res->json('id'));
            foreach ($case['expect'] as $key => $value) {
                $this->assertSame($value, $stored->getAttribute($key), $key);
            }
            $this->assertSame($user->id, $stored->user_id, 'the listing is hers, whatever the body says');
        } else {
            $res->assertStatus(422)->assertExactJson(['errors' => $case['errors']]);
            $this->assertSame(0, Listing::count(), 'a refused listing leaves no row');
        }
    }

    // ── Line B ──────────────────────────────────────────────────────────────────────────

    /** Approved by a moderator at $at: written a day before, published with a review time. */
    private function approved(User $user, Carbon $at): Listing
    {
        return $this->makeListing(['user_id' => $user->id, 'status' => ListingStatus::Published, 'reviewed_at' => $at, 'published_at' => $at, 'created_at' => $at->copy()->subDay()]);
    }

    private function postAs(User $user): Listing
    {
        $this->signIn($user);
        $id = $this->postJson('/api/v1/listings', $this->validBody())->assertCreated()->json('id');

        return Listing::query()->findOrFail($id);
    }

    public function test_a_new_account_s_first_listing_waits_for_a_moderator_and_is_not_public(): void
    {
        config(['princess.moderation.launch_phase' => false]);
        $listing = $this->postAs($this->makeUser());

        $this->assertSame(ListingStatus::Pending, $listing->status);
        $this->assertSame(HeldFor::FirstListing, $listing->held_for);
        $this->assertNull($listing->published_at);
        $this->getJson("/api/v1/listings/{$listing->id}")->assertNotFound();
    }

    public function test_a_trusted_account_publishes_at_once_when_the_launch_phase_is_over(): void
    {
        config(['princess.moderation.launch_phase' => false]);
        $user = $this->makeUser();
        $this->approved($user, Carbon::now()->subDay());

        $listing = $this->postAs($user);
        $this->assertSame(ListingStatus::Published, $listing->status);
        $this->assertNull($listing->held_for);
        $this->assertNotNull($listing->published_at);
        $this->getJson("/api/v1/listings/{$listing->id}")->assertOk();
    }

    public function test_during_the_launch_phase_even_a_trusted_account_waits(): void
    {
        config(['princess.moderation.launch_phase' => true]);
        $user = $this->makeUser();
        $this->approved($user, Carbon::now()->subDay());

        $listing = $this->postAs($user);
        $this->assertSame(ListingStatus::Pending, $listing->status);
        $this->assertSame(HeldFor::Launch, $listing->held_for);
    }

    public function test_during_the_launch_phase_an_untrusted_account_is_held_for_its_first_listing(): void
    {
        config(['princess.moderation.launch_phase' => true]);
        $this->assertSame(HeldFor::FirstListing, $this->postAs($this->makeUser())->held_for);
    }

    public function test_trust_comes_only_from_a_moderator_s_approval(): void
    {
        config(['princess.moderation.launch_phase' => false]);
        $now = Carbon::now();

        // a rejected first listing earns nothing
        $rejected = $this->makeUser();
        $this->makeListing(['user_id' => $rejected->id, 'status' => ListingStatus::Rejected, 'reviewed_at' => $now->copy()->subDay(), 'published_at' => null]);
        $this->assertSame(ListingStatus::Pending, $this->postAs($rejected)->status, 'rejected first listing');

        // a listing that published without review earns nothing either
        $unreviewed = $this->makeUser();
        $this->makeListing(['user_id' => $unreviewed->id, 'status' => ListingStatus::Published, 'reviewed_at' => null]);
        $this->assertSame(ListingStatus::Pending, $this->postAs($unreviewed)->status, 'published without review');
    }

    public function test_a_removal_sends_her_back_to_review_until_a_moderator_approves_again(): void
    {
        config(['princess.moderation.launch_phase' => false]);
        $now = Carbon::now();
        $user = $this->makeUser();
        $this->approved($user, $now->copy()->subDays(3));
        $this->approved($user, $now->copy()->subDays(2));
        $this->makeListing(['user_id' => $user->id, 'status' => ListingStatus::Removed, 'reviewed_at' => $now->copy()->subDay(), 'published_at' => $now->copy()->subDays(4), 'created_at' => $now->copy()->subDays(5)]);

        $this->assertSame(ListingStatus::Pending, $this->postAs($user)->status, 'removed after her approvals');

        $this->approved($user, $now->copy()->subHour());
        $this->assertSame(ListingStatus::Published, $this->postAs($user)->status, 'approved again after the removal');
    }

    public function test_a_signed_in_account_that_has_not_verified_its_email_posts_into_no_queue(): void
    {
        config(['princess.moderation.launch_phase' => false]);
        $user = $this->makeUser(verified: false);
        $this->approved($user, Carbon::now()->subDay());

        $listing = $this->postAs($user);
        $this->assertSame(ListingStatus::Unverified, $listing->status);
        $this->assertNull($listing->held_for);
    }

    public function test_the_api_alone_decides_a_listing_s_state_and_owner(): void
    {
        config(['princess.moderation.launch_phase' => false]);
        $user = $this->makeUser();
        $other = $this->makeUser();
        $this->signIn($user);

        $id = $this->postJson('/api/v1/listings', $this->validBody() + [
            'status' => 'published', 'held_for' => null, 'published_at' => '2020-01-01T00:00:00Z',
            'reviewed_at' => '2020-01-01T00:00:00Z', 'user_id' => $other->id, 'id' => '00000000-0000-4000-8000-000000000000',
        ])->assertCreated()->json('id');

        $listing = Listing::query()->findOrFail($id);
        $this->assertNotSame('00000000-0000-4000-8000-000000000000', $listing->id);
        $this->assertSame($user->id, $listing->user_id);
        $this->assertSame(ListingStatus::Pending, $listing->status);
        $this->assertNull($listing->published_at);
        $this->assertNull($listing->reviewed_at);
    }

    // ── The daily limit ─────────────────────────────────────────────────────────────────

    public function test_one_account_posts_at_most_five_listings_in_24_hours_whatever_becomes_of_them(): void
    {
        $limit = config('princess.posting.per_day');
        $user = $this->makeUser();
        $first = Carbon::now()->startOfSecond();
        Carbon::setTestNow($first);
        $ids = [];
        foreach (range(1, $limit) as $i) {
            $ids[] = $this->postAs($user)->id;
            Carbon::setTestNow($first->copy()->addMinutes($i));
        }
        // what became of them does not matter
        Listing::query()->whereKey($ids[0])->update(['status' => ListingStatus::Rejected->value]);

        $this->signIn($user);
        $refused = $this->postJson('/api/v1/listings', $this->validBody())->assertStatus(429);
        $this->assertSame('posting_limit', $refused->json('error'));
        // a place frees when the first of the five turns 24 hours old
        $expected = (int) Carbon::now()->diffInSeconds($first->copy()->addDay(), absolute: true);
        $this->assertSame($expected, $refused->json('retry_after'));
        $this->assertSame((string) $expected, $refused->headers->get('Retry-After'));
        $this->assertSame($limit, Listing::query()->where('user_id', $user->id)->count());

        // another account is not affected
        $this->postAs($this->makeUser());

        // a second after the first turns 24 hours old, she may post again, once
        Carbon::setTestNow($first->copy()->addDay()->addSecond());
        $this->postAs($user);
        $this->signIn($user);
        $this->postJson('/api/v1/listings', $this->validBody())->assertStatus(429);
        Carbon::setTestNow();
    }
}
