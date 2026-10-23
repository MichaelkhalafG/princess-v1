<?php

namespace Tests\Feature;

use App\Enums\HeldFor;
use App\Enums\ListingStatus;
use App\Filament\Resources\Reports\Pages\ListReportedListings;
use App\Filament\Resources\Reports\Pages\ViewReportedListing;
use App\Models\Listing;
use App\Models\ModerationEvent;
use App\Models\Report;
use App\Moderation\Moderation;
use App\Moderation\Signals;
use App\Notifications\ModerationAlert;
use Filament\Facades\Filament;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;
use Livewire\Livewire;
use Tests\TestCase;
use Tests\Unit\ListingCasesTest;

// Reporting a listing (no account needed, nothing about the reporter kept), what moderators do
// with reports, auto-hide (off by default), and the alerts.
class ReportsTest extends TestCase
{
    use RefreshDatabase;

    private function report(Listing $listing, array $body = ['reason' => 'scam'], string $from = '203.0.113.1')
    {
        return $this->withServerVariables(['REMOTE_ADDR' => $from])->postJson("/api/v1/listings/{$listing->id}/reports", $body);
    }

    public function test_anyone_reports_a_published_listing_and_nothing_about_them_is_kept(): void
    {
        $listing = $this->makeListing();
        $this->report($listing, ['reason' => 'scam', 'note' => '  رقم غير صحيح  '])->assertStatus(202)->assertExactJson(['received' => true]);

        $report = Report::query()->sole();
        $this->assertSame([$listing->id, 'scam', 'رقم غير صحيح', Report::OPEN], [$report->listing_id, $report->reason, $report->note, $report->status]);
        $this->assertEqualsCanonicalizing(
            ['id', 'listing_id', 'reason', 'note', 'status', 'handled_by', 'handled_at', 'created_at'],
            Schema::getColumnListing('reports'),
            'no column for an account, an address or a device',
        );
    }

    public function test_a_report_needs_a_reason_from_the_list_and_a_short_note(): void
    {
        $listing = $this->makeListing();
        $max = config('princess.moderation.report_note_max');
        $this->report($listing, [])->assertStatus(422)->assertExactJson(['errors' => ['reason' => 'required']]);
        $this->report($listing, ['reason' => 'not-a-reason'])->assertStatus(422)->assertExactJson(['errors' => ['reason' => 'invalid']]);
        $this->report($listing, ['reason' => 'scam', 'note' => str_repeat('ب', $max + 1)])->assertStatus(422)->assertExactJson(['errors' => ['note' => 'too_long']]);
        $this->report($listing, ['reason' => 'scam', 'note' => ['x']])->assertStatus(422)->assertExactJson(['errors' => ['note' => 'invalid']]);
        $this->assertSame(0, Report::count());
    }

    public function test_only_a_published_listing_can_be_reported(): void
    {
        $pending = $this->makeListing(['status' => ListingStatus::Pending, 'published_at' => null]);
        $this->report($pending)->assertNotFound();
        $this->postJson('/api/v1/listings/'.\Illuminate\Support\Str::uuid().'/reports', ['reason' => 'scam'])->assertNotFound();
    }

    public function test_one_report_per_listing_a_day_from_one_address_and_a_limit_an_hour(): void
    {
        $listing = $this->makeListing();
        $this->report($listing)->assertStatus(202);
        $this->report($listing)->assertStatus(429)->assertJsonPath('error', 'already_reported');
        $this->report($listing, from: '203.0.113.2')->assertStatus(202);

        config(['princess.rate_limits.reports_per_ip_per_hour' => 2]);
        $this->report($this->makeListing(), from: '203.0.113.3')->assertStatus(202);
        $this->report($this->makeListing(), from: '203.0.113.3')->assertStatus(202);
        $this->report($this->makeListing(), from: '203.0.113.3')->assertStatus(429)->assertJsonPath('error', 'too_many_attempts');
    }

    // ── Auto-hide ───────────────────────────────────────────────────────────────────────

    public function test_auto_hide_is_off_by_default(): void
    {
        $this->assertSame(0, config('princess.moderation.auto_hide_reports'));
        $listing = $this->makeListing();
        foreach (range(1, 5) as $i) {
            $this->report($listing, from: "203.0.113.$i")->assertStatus(202);
        }
        $this->assertSame(ListingStatus::Published, $listing->fresh()->status);
    }

    public function test_with_auto_hide_on_enough_reports_take_it_off_the_board_until_a_moderator_looks(): void
    {
        config(['princess.moderation.auto_hide_reports' => 2]);
        $publishedAt = Carbon::now()->subDays(3)->startOfSecond();
        $listing = $this->makeListing(['published_at' => $publishedAt]);

        $this->report($listing, from: '203.0.113.1')->assertStatus(202);
        $this->assertSame(ListingStatus::Published, $listing->fresh()->status);
        $this->report($listing, from: '203.0.113.2')->assertStatus(202);
        $hidden = $listing->fresh();
        $this->assertSame([ListingStatus::Pending, HeldFor::Reports], [$hidden->status, $hidden->held_for]);
        $this->getJson("/api/v1/listings/{$listing->id}")->assertNotFound();
        $this->assertSame([null, 'auto_hidden'], [ModerationEvent::query()->sole()->moderator_id, ModerationEvent::query()->sole()->action]);

        // a moderator puts it back, where it was on the board, and its reports close
        Moderation::dismissReports($hidden, $this->makeModerator());
        $back = $listing->fresh();
        $this->assertSame(ListingStatus::Published, $back->status);
        $this->assertTrue($back->published_at->equalTo($publishedAt), 'its place on the board is kept');
        $this->assertSame(0, Report::query()->open()->count());
    }

    // ── Moderators and reports ──────────────────────────────────────────────────────────

    public function test_removing_a_reported_listing_closes_its_reports_and_marks_her_next_one(): void
    {
        $moderator = $this->makeModerator();
        $listing = $this->makeListing();
        $this->report($listing)->assertStatus(202);
        Moderation::remove($listing, $moderator, 'misleading');

        $this->assertSame(Report::ACTIONED, Report::query()->sole()->status);
        $this->assertSame(1, ModerationEvent::query()->where('action', 'removed')->sole()->reports);

        $next = $this->signIn($listing->user)->postJson('/api/v1/listings', ListingCasesTest::caseFile()['base'])->assertCreated()->json('id');
        $this->assertContains(Signals::REPORTED_BEFORE, Listing::query()->findOrFail($next)->signals);
    }

    public function test_the_reports_screen_lists_reported_listings_and_its_buttons_work(): void
    {
        Filament::setCurrentPanel(Filament::getPanel('admin'));
        $moderator = $this->makeModerator();
        $reported = $this->makeListing(['title' => 'مبلّغ عنه', 'whatsapp' => '+201023232323']);
        $sharesHerNumber = $this->makeListing(['title' => 'رقم مشترك', 'whatsapp' => '+201023232323']);
        $quiet = $this->makeListing();
        $this->report($reported, ['reason' => 'scam', 'note' => 'ليست صاحبة الرقم'])->assertStatus(202);

        $this->actingAs($moderator, 'moderator');
        Livewire::test(ListReportedListings::class)->assertCanSeeTableRecords([$reported])->assertCanNotSeeTableRecords([$quiet, $sharesHerNumber]);
        $this->get("/admin/reports/{$reported->id}")->assertOk()
            ->assertSee('ليست صاحبة الرقم')
            ->assertSee('another account')->assertSee('رقم مشترك');

        Livewire::test(ViewReportedListing::class, ['record' => $reported->getRouteKey()])->callAction('dismissReports')->assertHasNoActionErrors();
        $this->assertSame(Report::DISMISSED, Report::query()->sole()->status);
        $this->assertSame(ListingStatus::Published, $reported->fresh()->status);
        Livewire::test(ListReportedListings::class)->assertCanNotSeeTableRecords([$reported]);
    }

    // ── Alerts ──────────────────────────────────────────────────────────────────────────

    public function test_new_reports_and_a_waiting_queue_are_emailed_once_to_the_moderators(): void
    {
        Notification::fake();
        config(['princess.moderation.alert_email' => 'moderators@example.test']);
        $sent = fn () => Notification::sent(new AnonymousNotifiable, ModerationAlert::class)->count();

        $this->assertSame(0, $this->artisan('princess:moderation-alerts'));
        $this->assertSame(0, $sent(), 'nothing new, nothing sent');

        $this->report($this->makeListing())->assertStatus(202);
        $this->artisan('princess:moderation-alerts');
        $this->assertSame(1, $sent());
        $this->artisan('princess:moderation-alerts');
        $this->assertSame(1, $sent(), 'the same report is not told twice');

        $this->makeListing(['status' => ListingStatus::Pending, 'published_at' => null, 'created_at' => Carbon::now()->subHours(config('princess.moderation.alert_backlog_hours') + 1)]);
        $this->artisan('princess:moderation-alerts');
        $this->assertSame(2, $sent(), 'the backlog');
        $this->artisan('princess:moderation-alerts');
        $this->assertSame(2, $sent(), 'and not again within the hour count');

        Notification::assertSentOnDemand(ModerationAlert::class, fn ($n, $channels, $notifiable) => $notifiable->routes['mail'] === 'moderators@example.test');
    }

    public function test_without_an_alert_address_nothing_is_sent(): void
    {
        Notification::fake();
        config(['princess.moderation.alert_email' => null]);
        $this->report($this->makeListing())->assertStatus(202);
        $this->artisan('princess:moderation-alerts');
        Notification::assertNothingSent();
    }

    public function test_the_alerts_run_every_hour(): void
    {
        $events = collect(app(Schedule::class)->events())->filter(fn ($e) => str_contains((string) $e->command, 'princess:moderation-alerts'));
        $this->assertSame('0 * * * *', $events->sole()->expression);
    }
}
