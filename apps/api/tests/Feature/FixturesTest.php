<?php

namespace Tests\Feature;

use App\Enums\ListingStatus;
use App\Models\Listing;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// The page tests' fixtures command: it creates published listings locally, and nothing in production.
class FixturesTest extends TestCase
{
    use RefreshDatabase;

    private function file(): string
    {
        $file = tempnam(sys_get_temp_dir(), 'fixtures');
        file_put_contents($file, json_encode(['listings' => [[
            'key' => 'one', 'name' => 'اسم', 'title' => 'عنوان', 'category' => 'nails', 'country' => 'EG',
            'city' => 'مدينة', 'description' => 'وصف', 'social' => 'one.handle', 'minutes_ago' => 5,
        ]]]));

        return $file;
    }

    public function test_it_creates_published_listings_where_tests_run(): void
    {
        $this->assertSame(0, $this->artisan('princess:fixtures', ['file' => $this->file()]));
        $listing = Listing::query()->sole();
        $this->assertSame(ListingStatus::Published, $listing->status);
        $this->getJson("/api/v1/listings/{$listing->id}")->assertOk();
    }

    public function test_it_refuses_in_production(): void
    {
        $this->app['env'] = 'production';
        $this->assertSame(1, $this->artisan('princess:fixtures', ['file' => $this->file()]));
        $this->assertSame(0, Listing::count());
    }
}
