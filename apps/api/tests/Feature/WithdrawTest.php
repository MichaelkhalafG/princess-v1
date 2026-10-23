<?php

namespace Tests\Feature;

use App\Enums\ListingStatus;
use App\Models\Listing;
use App\Models\Photo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Tests\Support\ImageFixtures;
use Tests\TestCase;
use Tests\Unit\ListingCasesTest;

// She removes her own listing from her listings page, in any state, for good, with its photo.
class WithdrawTest extends TestCase
{
    use RefreshDatabase;

    public function test_she_removes_her_listing_in_any_state_and_it_is_gone_for_good(): void
    {
        $user = $this->makeUser();
        foreach (ListingStatus::cases() as $status) {
            $listing = $this->makeListing(['user_id' => $user->id, 'status' => $status, 'published_at' => $status === ListingStatus::Published ? Carbon::now() : null]);
            $this->signIn($user)->deleteJson("/api/v1/me/listings/{$listing->id}")->assertNoContent();
            $this->assertNull(Listing::query()->find($listing->id), $status->value);
            $this->getJson("/api/v1/listings/{$listing->id}")->assertNotFound();
        }
    }

    public function test_her_photo_goes_with_it(): void
    {
        config(['princess.moderation.launch_phase' => false]);
        $user = $this->makeUser();
        $this->makeListing(['user_id' => $user->id, 'reviewed_at' => Carbon::now()->subDay(), 'created_at' => Carbon::now()->subDays(2), 'whatsapp' => '+201090909090']);
        ob_start();
        imagejpeg(ImageFixtures::picture(600, 400));
        $photo = $this->signIn($user)->withHeader('Accept', 'application/json')
            ->post('/api/v1/photos', ['photo' => UploadedFile::fake()->createWithContent('p.jpg', ob_get_clean())])->json('id');
        $id = $this->signIn($user)->postJson('/api/v1/listings', [...ListingCasesTest::caseFile()['base'], 'photo' => $photo])->assertJsonPath('status', 'published')->json('id');
        $this->assertNotNull($this->storedPhoto($photo, Photo::PUBLIC));

        $this->signIn($user)->deleteJson("/api/v1/me/listings/{$id}")->assertNoContent();
        $this->assertNull(Photo::query()->find($photo));
        $this->assertNull($this->storedPhoto($photo, Photo::PUBLIC));
        $this->get("/photos/{$photo}.jpg")->assertNotFound();
    }

    public function test_deleting_a_removed_listing_does_not_win_back_her_trust(): void
    {
        config(['princess.moderation.launch_phase' => false]);
        $user = $this->makeUser();
        $this->makeListing(['user_id' => $user->id, 'reviewed_at' => Carbon::now()->subDays(2), 'created_at' => Carbon::now()->subDays(3), 'whatsapp' => '+201091919191']);
        $live = $this->makeListing(['user_id' => $user->id, 'created_at' => Carbon::now()->subDays(3), 'whatsapp' => '+201092929292']);
        \App\Moderation\Moderation::remove($live, $this->makeModerator(), 'prohibited');

        $this->signIn($user)->deleteJson("/api/v1/me/listings/{$live->id}")->assertNoContent();
        $this->assertFalse($user->fresh()->isTrusted());
        $this->signIn($user)->postJson('/api/v1/listings', ListingCasesTest::caseFile()['base'])->assertJsonPath('status', 'pending');
    }

    public function test_someone_else_s_listing_is_not_found_and_stays(): void
    {
        $theirs = $this->makeListing();
        $this->signIn($this->makeUser())->deleteJson("/api/v1/me/listings/{$theirs->id}")->assertNotFound();
        $this->assertNotNull($theirs->fresh());
        $this->signOut()->deleteJson("/api/v1/me/listings/{$theirs->id}")->assertUnauthorized();
    }
}
