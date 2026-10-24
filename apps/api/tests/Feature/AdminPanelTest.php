<?php

namespace Tests\Feature;

use App\Enums\ListingStatus;
use App\Filament\Resources\Bans\BanResource;
use App\Filament\Resources\Bans\Pages\CreateBan;
use App\Filament\Resources\Bans\Pages\ListBans;
use App\Filament\Resources\LiveListings\LiveListingResource;
use App\Filament\Resources\LiveListings\Pages\ListLiveListings;
use App\Filament\Resources\LiveListings\Pages\ViewLiveListing;
use App\Filament\Resources\ReviewQueue\Pages\ListReviewQueue;
use App\Filament\Resources\ReviewQueue\Pages\ReviewListing;
use App\Filament\Resources\ReviewQueue\ReviewQueueResource;
use App\Models\Ban;
use App\Models\ModerationEvent;
use Filament\Facades\Filament;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Livewire\Livewire;
use Tests\TestCase;

// The admin at /admin: who gets in, what the screens show, and that their buttons take the
// decisions in App\Moderation\Moderation (ModerationTest covers what those decisions do).
class AdminPanelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Filament::setCurrentPanel(Filament::getPanel('admin'));
    }

    // ── Who gets in ─────────────────────────────────────────────────────────────────────

    public function test_signed_out_the_admin_sends_you_to_its_sign_in(): void
    {
        $this->get('/admin/queue')->assertRedirect('/admin/login');
        $this->get('/admin/login')->assertOk();
    }

    public function test_a_site_account_is_not_a_moderator(): void
    {
        $this->actingAs($this->makeUser(), 'web')->get('/admin/queue')->assertRedirect('/admin/login');
    }

    public function test_a_moderator_without_an_authenticator_app_must_set_one_up_first(): void
    {
        $this->actingAs($this->makeModerator(authenticatorApp: false), 'moderator')
            ->get('/admin/queue')->assertRedirectContains('/admin/multi-factor-authentication/set-up');
    }

    public function test_the_queue_shows_what_waits_oldest_first_and_nothing_else(): void
    {
        $now = Carbon::now();
        $newer = $this->makeListing(['status' => ListingStatus::Pending, 'published_at' => null, 'title' => 'الأحدث', 'created_at' => $now->copy()->subHour()]);
        $older = $this->makeListing(['status' => ListingStatus::Pending, 'published_at' => null, 'title' => 'الأقدم', 'created_at' => $now->copy()->subDay()]);
        $live = $this->makeListing(['title' => 'على اللوحة']);

        $this->actingAs($this->makeModerator(), 'moderator');
        $this->get('/admin/queue')->assertOk();
        Livewire::test(ListReviewQueue::class)
            ->assertCanSeeTableRecords([$older, $newer], inOrder: true)
            ->assertCanNotSeeTableRecords([$live]);
    }

    public function test_the_review_screen_shows_the_listing_and_its_private_photo(): void
    {
        $listing = $this->makeListing(['status' => ListingStatus::Pending, 'published_at' => null, 'title' => 'عنوان للمراجعة', 'whatsapp' => '+201012121212', 'signals' => ['contact_in_text']]);

        $this->actingAs($this->makeModerator(), 'moderator')
            ->get("/admin/queue/{$listing->id}")
            ->assertOk()->assertSee('عنوان للمراجعة')->assertSee('+201012121212')->assertSee('Number or link in the text');
    }

    public function test_her_text_is_laid_out_in_its_own_direction(): void
    {
        $listing = $this->makeListing(['status' => ListingStatus::Pending, 'published_at' => null, 'title' => 'حنّة للعرائس؟',
            'description' => 'للتواصل أسرع كلميني على 0551234567 أو انستا hanan.henna']);

        $html = $this->actingAs($this->makeModerator(), 'moderator')->get("/admin/queue/{$listing->id}")->assertOk()->getContent();

        // the description sits in an element that takes its direction from its own first letter
        $this->assertMatchesRegularExpression('/<div[^>]*dir="auto"[^>]*>\s*للتواصل أسرع/u', $html);
        // the heading keeps her title whole, question mark at its end, inside isolate marks
        $this->assertStringContainsString("\u{2068}حنّة للعرائس؟\u{2069}", $html);
    }

    public function test_statuses_read_as_words_and_pages_have_their_own_titles(): void
    {
        $this->actingAs($this->makeModerator(), 'moderator');
        $listing = $this->makeListing(['status' => ListingStatus::Pending, 'published_at' => null]);

        $this->get("/admin/queue/{$listing->id}")->assertSee('Waiting for review')->assertDontSee('>pending<', false);
        $this->assertSame('Review queue', Livewire::test(ListReviewQueue::class)->instance()->getTitle());
        $this->assertSame([], Livewire::test(ListReviewQueue::class)->instance()->getBreadcrumbs());
    }

    public function test_the_search_box_finds_a_listing_by_title_name_number_or_handle_in_its_own_list(): void
    {
        $this->actingAs($this->makeModerator(), 'moderator');
        $waiting = $this->makeListing(['status' => ListingStatus::Pending, 'published_at' => null, 'name' => 'حنان', 'whatsapp' => '+201077889900', 'social' => 'hanan.henna']);
        $live = $this->makeListing(['name' => 'ريم']);

        $found = fn (string $resource, string $query) => $resource::getGlobalSearchResults($query)->map(fn ($r) => $r->url)->all();
        foreach (['حنان', '+2010778899', 'hanan.henna'] as $query) {
            $this->assertSame([ReviewQueueResource::getUrl('view', ['record' => $waiting])], $found(ReviewQueueResource::class, $query), $query);
        }
        $this->assertSame([], $found(LiveListingResource::class, 'حنان'), 'a waiting listing is not among the live ones');
        $this->assertSame([LiveListingResource::getUrl('view', ['record' => $live])], $found(LiveListingResource::class, 'ريم'));
    }

    public function test_live_listings_show_every_contact_column(): void
    {
        $this->actingAs($this->makeModerator(), 'moderator');
        $this->makeListing(['phone' => '+201022334455', 'social' => 'mona.nails']);

        // rendered in the rows, not merely available behind the column toggle
        Livewire::test(ListLiveListings::class)
            ->assertCanRenderTableColumn('whatsapp')->assertCanRenderTableColumn('phone')->assertCanRenderTableColumn('social');
    }

    public function test_the_queue_is_searched_by_a_number_even_with_its_column_hidden(): void
    {
        $this->actingAs($this->makeModerator(), 'moderator');
        $a = $this->makeListing(['status' => ListingStatus::Pending, 'published_at' => null, 'phone' => '+201066554433']);
        $b = $this->makeListing(['status' => ListingStatus::Pending, 'published_at' => null]);

        Livewire::test(ListReviewQueue::class)->searchTable('+20106655')
            ->assertCanSeeTableRecords([$a])->assertCanNotSeeTableRecords([$b]);
    }

    // ── The buttons ─────────────────────────────────────────────────────────────────────

    public function test_approve_and_reject_on_the_review_screen(): void
    {
        $moderator = $this->makeModerator();
        $this->actingAs($moderator, 'moderator');
        $a = $this->makeListing(['status' => ListingStatus::Pending, 'published_at' => null]);
        $b = $this->makeListing(['status' => ListingStatus::Pending, 'published_at' => null]);

        Livewire::test(ReviewListing::class, ['record' => $a->getRouteKey()])->callAction('approve')->assertHasNoActionErrors();
        $this->assertSame(ListingStatus::Published, $a->fresh()->status);

        Livewire::test(ReviewListing::class, ['record' => $b->getRouteKey()])->callAction('reject', ['reason' => 'duplicate'])->assertHasNoActionErrors();
        $this->assertSame([ListingStatus::Rejected, 'duplicate'], [$b->fresh()->status, $b->fresh()->reject_reason]);

        $this->assertSame([[$moderator->id, 'approved'], [$moderator->id, 'rejected']], ModerationEvent::query()->orderBy('id')->get()->map(fn ($e) => [$e->moderator_id, $e->action])->all());
    }

    public function test_a_rejection_needs_a_reason(): void
    {
        $this->actingAs($this->makeModerator(), 'moderator');
        $listing = $this->makeListing(['status' => ListingStatus::Pending, 'published_at' => null]);

        Livewire::test(ReviewListing::class, ['record' => $listing->getRouteKey()])->callAction('reject', ['reason' => null])->assertHasActionErrors(['reason' => 'required']);
        $this->assertSame(ListingStatus::Pending, $listing->fresh()->status);
    }

    public function test_remove_and_ban_from_the_live_listing_screen(): void
    {
        $this->actingAs($this->makeModerator(), 'moderator');
        $listing = $this->makeListing(['whatsapp' => '+201034343434']);

        Livewire::test(ViewLiveListing::class, ['record' => $listing->getRouteKey()])->callAction('remove', ['reason' => 'prohibited', 'ban' => true])->assertHasNoActionErrors();
        $this->assertSame(ListingStatus::Removed, $listing->fresh()->status);
        $this->assertTrue(Ban::query()->active()->where('kind', Ban::NUMBER)->where('value', '+201034343434')->exists());
    }

    public function test_a_number_is_banned_by_hand_and_the_ban_lifted(): void
    {
        $moderator = $this->makeModerator();
        $this->actingAs($moderator, 'moderator');

        Livewire::test(CreateBan::class)->fillForm(['kind' => Ban::NUMBER, 'value' => 'not a number', 'reason' => 'other'])->call('create')->assertHasFormErrors(['value']);
        Livewire::test(CreateBan::class)->fillForm(['kind' => Ban::NUMBER, 'value' => '+201056565656', 'reason' => 'other'])->call('create')->assertHasNoFormErrors();
        $ban = Ban::query()->sole();
        $this->assertSame([$moderator->id, null], [$ban->created_by, $ban->lifted_at]);

        Livewire::test(ListBans::class)->callTableAction('lift', $ban)->assertHasNoTableActionErrors();
        $this->assertNotNull($ban->fresh()->lifted_at);
        $this->assertSame(['banned', 'ban_lifted'], ModerationEvent::query()->orderBy('id')->pluck('action')->all());
    }

    public function test_moderators_cannot_edit_a_listing_anywhere(): void
    {
        $this->actingAs($this->makeModerator(), 'moderator');
        $pending = $this->makeListing(['status' => ListingStatus::Pending, 'published_at' => null]);
        $live = $this->makeListing();

        $this->get("/admin/queue/{$pending->id}/edit")->assertNotFound();
        $this->get("/admin/live/{$live->id}/edit")->assertNotFound();
        $this->assertFalse(BanResource::canEdit(Ban::create(['kind' => Ban::NUMBER, 'value' => '+201000000001', 'reason' => 'other'])));
    }
}
