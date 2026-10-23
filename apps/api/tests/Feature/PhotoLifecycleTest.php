<?php

namespace Tests\Feature;

use App\Enums\ListingStatus;
use App\Models\Listing;
use App\Models\Photo;
use App\Models\User;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Tests\Support\ImageFixtures;
use Tests\TestCase;
use Tests\Unit\ListingCasesTest;

// A photo from upload to deletion: claimed by one listing, private until it is published,
// public only while it is, and gone with her account, her listing, or when nobody needs it.
class PhotoLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function uploadPhoto(): string
    {
        ob_start();
        imagejpeg(ImageFixtures::picture(600, 400));
        $file = UploadedFile::fake()->createWithContent('photo.jpg', ob_get_clean());

        return $this->withHeader('Accept', 'application/json')->post('/api/v1/photos', ['photo' => $file])->assertCreated()->json('id');
    }

    /** @return array<string, mixed> */
    private function body(array $over = []): array
    {
        return [...ListingCasesTest::caseFile()['base'], ...$over];
    }

    private function trusted(): User
    {
        $user = $this->makeUser();
        $this->makeListing(['user_id' => $user->id, 'reviewed_at' => Carbon::now()->subDay(), 'created_at' => Carbon::now()->subDays(2)]);

        return $user;
    }

    // ── Claiming ────────────────────────────────────────────────────────────────────────

    public function test_a_listing_claims_only_a_photo_it_may_have(): void
    {
        $user = $this->makeUser();
        $other = $this->makeUser();
        $this->signIn($other);
        $othersPhoto = $this->uploadPhoto();
        $this->signOut();
        $claimed = $this->uploadPhoto();
        $this->signIn($user)->postJson('/api/v1/listings', $this->body(['photo' => $claimed]))->assertCreated();
        $old = $this->uploadPhoto();
        Photo::query()->whereKey($old)->update(['created_at' => Carbon::now()->subHours(config('princess.photos.unclaimed_hours'))->subMinute()]);

        $count = Listing::count();
        foreach (['not-an-id', (string) \Illuminate\Support\Str::uuid(), $othersPhoto, $claimed, $old, 12345] as $photo) {
            $this->signIn($user)->postJson('/api/v1/listings', $this->body(['photo' => $photo]))
                ->assertStatus(422)->assertExactJson(['errors' => ['photo' => 'invalid']]);
        }
        $this->assertSame($count, Listing::count(), 'a refused photo creates nothing');
    }

    public function test_a_photo_uploaded_before_signing_up_is_claimed_by_her_new_account(): void
    {
        $photo = $this->uploadPhoto();
        $id = $this->postJson('/api/v1/listings', $this->body([
            'photo' => $photo, 'email' => 'new@example.test', 'password' => 'a-good-password',
        ]))->assertCreated()->json('id');

        $row = Photo::query()->findOrFail($photo);
        $this->assertSame($id, $row->listing_id);
        $this->assertSame(User::query()->where('email', 'new@example.test')->value('id'), $row->user_id);
    }

    // ── Private until published ─────────────────────────────────────────────────────────

    public function test_a_waiting_listing_s_photo_is_private_and_only_she_sees_it(): void
    {
        $user = $this->makeUser();
        $photo = $this->uploadPhoto();
        $this->signIn($user)->postJson('/api/v1/listings', $this->body(['photo' => $photo]))->assertCreated()->assertJsonPath('status', 'pending');

        $this->get("/photos/{$photo}.jpg")->assertNotFound();
        $this->assertNull($this->storedPhoto($photo, Photo::PUBLIC));

        $mine = $this->signIn($user)->getJson('/api/v1/me/listings')->assertOk()->json('items.0.photo');
        $this->assertSame([600, 400], [$mine['width'], $mine['height']]);
        $signed = $this->get($mine['url'])->assertOk();
        $this->assertSame($this->storedPhoto($photo, Photo::PRIVATE), $signed->streamedContent());

        // the address without its signature, or after it expires, shows nothing
        $this->get(strtok($mine['url'], '?'))->assertNotFound();
        $this->travel(config('princess.photos.private_link_minutes') + 1)->minutes();
        $this->get($mine['url'])->assertNotFound();
    }

    public function test_a_photo_is_public_exactly_while_its_listing_is_published(): void
    {
        config(['princess.moderation.launch_phase' => false]);
        $user = $this->trusted();
        $photo = $this->uploadPhoto();
        $id = $this->signIn($user)->postJson('/api/v1/listings', $this->body(['photo' => $photo]))->assertCreated()->assertJsonPath('status', 'published')->json('id');

        $shown = $this->getJson("/api/v1/listings/{$id}")->assertOk()->json('photo');
        $this->assertSame(['url' => "http://localhost/photos/{$photo}.jpg", 'width' => 600, 'height' => 400], $shown);
        $this->get("/photos/{$photo}.jpg")->assertOk()->assertHeader('Cache-Control', 'immutable, max-age=31536000, public');
        $this->assertNull($this->storedPhoto($photo, Photo::PRIVATE));

        $listing = Listing::query()->findOrFail($id);
        $listing->update(['status' => ListingStatus::Removed, 'reviewed_at' => Carbon::now()]);
        $this->get("/photos/{$photo}.jpg")->assertNotFound();
        $this->assertNull($this->storedPhoto($photo, Photo::PUBLIC));
        $this->assertNotNull($this->storedPhoto($photo, Photo::PRIVATE), 'kept privately for the moderators');
    }

    public function test_a_listing_deleted_on_its_own_takes_its_photo(): void
    {
        $user = $this->makeUser();
        $photo = $this->uploadPhoto();
        $id = $this->signIn($user)->postJson('/api/v1/listings', $this->body(['photo' => $photo]))->assertCreated()->json('id');

        Listing::query()->findOrFail($id)->delete();
        $this->assertNull(Photo::query()->find($photo));
        $this->assertNull($this->storedPhoto($photo, Photo::PRIVATE));
        $this->assertNull($this->storedPhoto($photo, Photo::PUBLIC));
    }

    // ── Gone with her account ───────────────────────────────────────────────────────────

    public function test_deleting_her_account_deletes_every_photo_file_of_hers_and_no_one_else_s(): void
    {
        config(['princess.moderation.launch_phase' => false]);
        $user = $this->trusted();
        $this->signIn($user);
        $published = $this->uploadPhoto();
        $this->postJson('/api/v1/listings', $this->body(['photo' => $published]))->assertCreated()->assertJsonPath('status', 'published');
        $unclaimed = $this->uploadPhoto();
        $other = $this->trusted();
        $this->signIn($other);
        $theirs = $this->uploadPhoto();

        $this->assertNotNull($this->storedPhoto($published, Photo::PUBLIC));
        $this->assertNotNull($this->storedPhoto($unclaimed, Photo::PRIVATE));
        $this->signIn($user)->deleteJson('/api/v1/me', ['password' => 'test-password'])->assertNoContent();

        $this->assertNull($this->storedPhoto($published, Photo::PUBLIC));
        $this->assertNull($this->storedPhoto($unclaimed, Photo::PRIVATE));
        $this->assertSame(0, Photo::query()->whereKey([$published, $unclaimed])->count());
        $this->assertNotNull($this->storedPhoto($theirs, Photo::PRIVATE), 'another account keeps its photo');
    }

    public function test_an_expired_unverified_account_takes_its_photo(): void
    {
        $photo = $this->uploadPhoto();
        $this->postJson('/api/v1/listings', $this->body(['photo' => $photo, 'email' => 'late@example.test', 'password' => 'a-good-password']))->assertCreated();
        User::query()->where('email', 'late@example.test')->update(['created_at' => Carbon::now()->subDays(config('princess.accounts.unverified_days'))->subMinute()]);

        $this->assertSame(0, $this->artisan('princess:prune-unverified'));
        $this->assertNull(Photo::query()->find($photo));
        $this->assertNull($this->storedPhoto($photo, Photo::PRIVATE));
    }

    // ── Cleanup ─────────────────────────────────────────────────────────────────────────

    public function test_unclaimed_uploads_and_refused_photos_are_deleted_on_time_and_no_sooner(): void
    {
        $hours = config('princess.photos.unclaimed_hours');
        $days = config('princess.photos.refused_days');
        $now = Carbon::now();

        $staleUpload = $this->uploadPhoto();
        $freshUpload = $this->uploadPhoto();
        Photo::query()->whereKey($staleUpload)->update(['created_at' => $now->copy()->subHours($hours)->subMinute()]);
        Photo::query()->whereKey($freshUpload)->update(['created_at' => $now->copy()->subHours($hours)->addMinute()]);

        $attach = function (ListingStatus $status, ?Carbon $reviewed) {
            $photo = $this->uploadPhoto();
            $listing = $this->makeListing(['status' => $status, 'reviewed_at' => $reviewed, 'published_at' => null]);
            Photo::query()->whereKey($photo)->update(['listing_id' => $listing->id]);

            return [$photo, $listing->id];
        };
        [$oldRejected, $oldRejectedListing] = $attach(ListingStatus::Rejected, $now->copy()->subDays($days)->subMinute());
        [$recentRejected] = $attach(ListingStatus::Rejected, $now->copy()->subDays($days)->addMinute());
        [$oldRemoved] = $attach(ListingStatus::Removed, $now->copy()->subDays($days)->subMinute());
        [$pending] = $attach(ListingStatus::Pending, null);

        $this->assertSame(0, $this->artisan('princess:prune-photos'));

        foreach ([$staleUpload, $oldRejected, $oldRemoved] as $gone) {
            $this->assertNull(Photo::query()->find($gone));
            $this->assertNull($this->storedPhoto($gone, Photo::PRIVATE));
        }
        foreach ([$freshUpload, $recentRejected, $pending] as $kept) {
            $this->assertNotNull($this->storedPhoto($kept, Photo::PRIVATE));
        }
        $this->assertNotNull(Listing::query()->find($oldRejectedListing), 'the refused listing\'s text stays');
    }

    public function test_the_photo_cleanup_runs_every_hour(): void
    {
        $events = collect(app(Schedule::class)->events())->filter(fn ($e) => str_contains((string) $e->command, 'princess:prune-photos'));
        $this->assertCount(1, $events);
        $this->assertSame('0 * * * *', $events->first()->expression);
    }

    public function test_a_photo_address_that_is_not_a_published_photo_shows_nothing(): void
    {
        $this->get('/photos/not-a-uuid.jpg')->assertNotFound();
        $this->get('/photos/'.\Illuminate\Support\Str::uuid().'.jpg')->assertNotFound();
    }
}
