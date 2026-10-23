<?php

namespace Tests\Feature;

use App\Enums\HeldFor;
use App\Enums\ListingStatus;
use App\Models\Ban;
use App\Models\Listing;
use App\Models\ModerationEvent;
use App\Models\User;
use App\Moderation\Moderation;
use App\Moderation\Signals;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use InvalidArgumentException;
use Tests\TestCase;
use Tests\Unit\ListingCasesTest;

// The filter that sends a listing to a human, and every decision a moderator can take, with
// its line in the audit log. The admin screens call exactly these (AdminPanelTest).
class ModerationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['princess.moderation.launch_phase' => false]);
    }

    private function trusted(): User
    {
        $user = $this->makeUser();
        $this->makeListing(['user_id' => $user->id, 'reviewed_at' => Carbon::now()->subDays(2), 'created_at' => Carbon::now()->subDays(3), 'whatsapp' => '+201099999999']);

        return $user;
    }

    /** @return array<string, mixed> */
    private function body(array $over = []): array
    {
        return [...ListingCasesTest::caseFile()['base'], ...$over];
    }

    private function postAs(User $user, array $over = []): Listing
    {
        $id = $this->signIn($user)->postJson('/api/v1/listings', $this->body($over))->assertCreated()->json('id');

        return Listing::query()->findOrFail($id);
    }

    // ── The filter ──────────────────────────────────────────────────────────────────────

    public function test_a_clean_listing_from_a_trusted_account_publishes_with_no_signal(): void
    {
        $listing = $this->postAs($this->trusted());
        $this->assertSame(ListingStatus::Published, $listing->status);
        $this->assertSame([], $listing->signals);
    }

    public function test_each_signal_sends_a_trusted_account_s_listing_to_a_moderator(): void
    {
        config(['princess.moderation.banned_words' => ['ممنوعة']]);
        // each from its own number, so no other signal can fire
        $cases = [
            Signals::BANNED_WORD => ['title' => 'خدمة ممنوعة', 'whatsapp' => '+201011110001'],
            Signals::CONTACT_IN_TEXT => ['description' => 'اتصلي على 01012345678', 'whatsapp' => '+201011110002'],
        ];
        foreach ($cases as $signal => $over) {
            $listing = $this->postAs($this->trusted(), $over);
            $this->assertSame(ListingStatus::Pending, $listing->status, $signal);
            $this->assertSame(HeldFor::Signal, $listing->held_for, $signal);
            $this->assertSame([$signal], $listing->signals, $signal);
        }
    }

    public function test_a_number_on_another_account_s_listing_is_a_signal(): void
    {
        $this->makeListing(['whatsapp' => '+201011111111']);
        $listing = $this->postAs($this->trusted(), ['whatsapp' => '+201011111111']);
        $this->assertSame([Signals::CONTACT_ELSEWHERE], $listing->signals);
        $this->assertSame(ListingStatus::Pending, $listing->status);
    }

    public function test_a_banned_number_or_handle_is_a_signal_on_any_account(): void
    {
        Moderation::addBan($this->makeModerator(), Ban::NUMBER, '+201022222222', 'other');
        Moderation::addBan($this->makeModerator(), Ban::INSTAGRAM, '@Banned.Handle', 'other');

        $this->assertSame([Signals::BANNED_CONTACT], $this->postAs($this->trusted(), ['whatsapp' => '+201022222222'])->signals);
        $this->assertSame([Signals::BANNED_CONTACT], $this->postAs($this->trusted(), ['social' => 'banned.handle'])->signals, 'handles compare in lower case');
    }

    public function test_the_third_listing_in_24_hours_is_a_signal(): void
    {
        $user = $this->trusted();
        $this->assertSame([], $this->postAs($user, ['whatsapp' => '+201033333331'])->signals);
        $this->assertSame([], $this->postAs($user, ['whatsapp' => '+201033333332'])->signals);
        $third = $this->postAs($user, ['whatsapp' => '+201033333333']);
        $this->assertSame([Signals::MANY_LISTINGS], $third->signals);
        $this->assertSame(ListingStatus::Pending, $third->status);
    }

    public function test_an_untrusted_account_s_listing_carries_its_signals_for_the_moderator(): void
    {
        $listing = $this->postAs($this->makeUser(), ['description' => 'www.example.com']);
        $this->assertSame(HeldFor::FirstListing, $listing->held_for);
        $this->assertSame([Signals::CONTACT_IN_TEXT], $listing->signals);
    }

    // ── Decisions ───────────────────────────────────────────────────────────────────────

    public function test_approving_publishes_it_records_who_and_trusts_her_account(): void
    {
        $moderator = $this->makeModerator();
        $user = $this->makeUser();
        $listing = $this->postAs($user);
        $this->assertSame(ListingStatus::Pending, $listing->status);

        Moderation::approve($listing, $moderator);
        $listing->refresh();
        $this->assertSame(ListingStatus::Published, $listing->status);
        $this->assertSame($moderator->id, $listing->reviewed_by);
        $this->assertNotNull($listing->published_at);
        $this->getJson("/api/v1/listings/{$listing->id}")->assertOk();
        $this->assertTrue($user->isTrusted());
        $this->assertSame(ListingStatus::Published, $this->postAs($user, ['whatsapp' => '+201044444444'])->status, 'her next listing publishes');

        $event = ModerationEvent::query()->sole();
        $this->assertSame(['approved', $moderator->id, $listing->id, $user->id], [$event->action, $event->moderator_id, $event->listing_id, $event->user_id]);
    }

    public function test_a_decision_applies_only_to_a_listing_in_the_right_state(): void
    {
        $moderator = $this->makeModerator();
        $published = $this->makeListing();
        $this->expectException(InvalidArgumentException::class);
        Moderation::approve($published, $moderator);
    }

    public function test_rejecting_keeps_it_off_the_board_and_shows_her_the_reason(): void
    {
        $moderator = $this->makeModerator();
        $user = $this->makeUser();
        $listing = $this->postAs($user);

        Moderation::reject($listing, $moderator, 'misleading');
        $this->assertSame(ListingStatus::Rejected, $listing->fresh()->status);
        $this->getJson("/api/v1/listings/{$listing->id}")->assertNotFound();
        $this->signIn($user)->getJson('/api/v1/me/listings')->assertOk()
            ->assertJsonPath('items.0.status', 'rejected')->assertJsonPath('items.0.reject_reason', 'misleading');
        $this->assertSame(['rejected', 'misleading'], [ModerationEvent::query()->sole()->action, ModerationEvent::query()->sole()->reason]);

        $this->expectException(InvalidArgumentException::class);
        Moderation::reject($this->postAs($user, ['whatsapp' => '+201055555555']), $moderator, 'not-a-reason');
    }

    public function test_removing_takes_it_off_the_board_and_sends_her_back_to_review(): void
    {
        $moderator = $this->makeModerator();
        $user = $this->trusted();
        $listing = $this->postAs($user);
        $this->assertSame(ListingStatus::Published, $listing->status);

        Moderation::remove($listing, $moderator, 'prohibited');
        $this->assertSame(ListingStatus::Removed, $listing->fresh()->status);
        $this->getJson("/api/v1/listings/{$listing->id}")->assertNotFound();
        $this->assertSame(HeldFor::FirstListing, $this->postAs($user, ['whatsapp' => '+201066666666'])->held_for);
    }

    // ── Bans ────────────────────────────────────────────────────────────────────────────

    public function test_a_ban_stops_her_posting_takes_down_her_listings_and_flags_her_numbers_anywhere(): void
    {
        $moderator = $this->makeModerator();
        $user = $this->trusted();
        $live = $this->postAs($user, ['whatsapp' => '+201077777771', 'social' => 'Her.Handle']);
        $waiting = $this->postAs($user, ['description' => 'www.example.com', 'phone' => '+201077777772', 'whatsapp' => null]);
        $this->assertSame(ListingStatus::Pending, $waiting->status);

        Moderation::reject($waiting, $moderator, 'prohibited', ban: true);

        $this->assertSame(ListingStatus::Removed, $live->fresh()->status);
        $this->assertSame(Moderation::BANNED_ACCOUNT_REASON, $live->fresh()->reject_reason);
        $this->assertSame(ListingStatus::Rejected, $waiting->fresh()->status);
        $this->assertEqualsCanonicalizing(
            [['account', (string) $user->id], ['number', '+201077777771'], ['number', '+201077777772'], ['number', '+201099999999'], ['instagram', 'her.handle']],
            Ban::query()->active()->get()->map(fn (Ban $b) => [$b->kind, $b->value])->all(),
        );

        // she cannot post, but she can still see her listings and delete her account
        $this->signIn($user)->postJson('/api/v1/listings', $this->body(['whatsapp' => '+201088888888']))->assertForbidden()->assertExactJson(['error' => 'account_suspended']);
        $this->signIn($user)->getJson('/api/v1/me/listings')->assertOk();

        // her number on a new account goes to a moderator (it is banned, and it is on her listing too)
        $this->assertSame([Signals::BANNED_CONTACT, Signals::CONTACT_ELSEWHERE], $this->postAs($this->trusted(), ['whatsapp' => '+201077777771'])->signals);

        // the bans outlive the account they came from
        $this->signIn($user)->deleteJson('/api/v1/me', ['password' => 'test-password'])->assertNoContent();
        $this->assertSame(5, Ban::query()->active()->count());
        $this->assertSame(0, Ban::query()->whereNotNull('user_id')->where('user_id', $user->id)->count());
    }

    public function test_lifting_the_account_ban_lets_her_post_again(): void
    {
        $moderator = $this->makeModerator();
        $user = $this->makeUser();
        Moderation::banAccount($user, $moderator, 'other');
        $this->signIn($user)->postJson('/api/v1/listings', $this->body())->assertForbidden();

        Moderation::lift(Ban::query()->where('kind', Ban::ACCOUNT)->sole(), $moderator);
        $this->signIn($user)->postJson('/api/v1/listings', $this->body())->assertCreated();
        $this->assertSame(['banned', 'ban_lifted'], ModerationEvent::query()->orderBy('id')->pluck('action')->all());
    }

    public function test_the_audit_log_keeps_the_decision_but_not_the_link_to_a_deleted_account(): void
    {
        $moderator = $this->makeModerator();
        $user = $this->makeUser();
        $listing = $this->postAs($user);
        Moderation::reject($listing, $moderator, 'duplicate');

        $this->signIn($user)->deleteJson('/api/v1/me', ['password' => 'test-password'])->assertNoContent();
        $event = ModerationEvent::query()->sole();
        $this->assertSame(['rejected', 'duplicate', $moderator->id], [$event->action, $event->reason, $event->moderator_id]);
        $this->assertNull($event->listing_id);
        $this->assertNull($event->user_id);
    }
}
