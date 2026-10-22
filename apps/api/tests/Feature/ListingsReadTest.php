<?php

namespace Tests\Feature;

use App\Enums\ListingStatus;
use App\Models\Listing;
use App\Support\ArabicFold;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Tests\TestCase;

// The board's reads against a real MySQL or MariaDB. Each test builds every row it asserts on.
// The filter and search cases are ported from the web app's tests/db/listings.test.ts.
class ListingsReadTest extends TestCase
{
    use RefreshDatabase;

    private string $countryA;

    private string $countryB;

    private string $catA;

    private string $catB;

    protected function setUp(): void
    {
        parent::setUp();
        [$this->countryA, $this->countryB] = array_keys(config('princess.countries'));
        [$this->catA, $this->catB] = array_keys(config('princess.categories'));
    }

    /** @return list<string> ids, in the order the board returns them */
    private function board(array $query): array
    {
        return array_column($this->getJson('/api/v1/listings?'.http_build_query($query))->assertOk()->json('items'), 'id');
    }

    private function boardHas(string $id, string $q): bool
    {
        return in_array($id, $this->board(['country' => $this->countryA, 'q' => $q]), true);
    }

    // ── Only published listings exist ──────────────────────────────────────────────────

    public function test_only_published_listings_are_listed_shown_or_used_as_others(): void
    {
        $byStatus = [];
        foreach (ListingStatus::cases() as $status) {
            $byStatus[$status->value] = $this->makeListing([
                'title' => 'علامة-الحالة',
                'status' => $status,
                'published_at' => $status === ListingStatus::Published ? Carbon::now() : null,
            ]);
        }
        $published = $byStatus[ListingStatus::Published->value];

        $res = $this->getJson('/api/v1/listings?'.http_build_query(['country' => $this->countryA, 'q' => 'علامة-الحالة']))->assertOk();
        $this->assertSame([$published->id], array_column($res->json('items'), 'id'));
        $this->assertSame(1, $res->json('total'));

        $this->getJson("/api/v1/listings/{$published->id}")->assertOk()->assertJsonPath('id', $published->id);

        // every other state answers exactly like an id that was never used
        $never = $this->getJson('/api/v1/listings/'.Str::uuid())->assertNotFound()->getContent();
        $this->assertSame('{"error":"not_found"}', $never);
        foreach ($byStatus as $value => $listing) {
            if ($value === ListingStatus::Published->value) {
                continue;
            }
            $this->assertSame($never, $this->getJson("/api/v1/listings/{$listing->id}")->assertNotFound()->getContent(), $value);
            $this->assertSame($never, $this->getJson("/api/v1/listings/{$listing->id}/others")->assertNotFound()->getContent(), $value);
        }
        $this->assertSame($never, $this->getJson('/api/v1/listings/not-a-uuid')->assertNotFound()->getContent());
    }

    public function test_a_listing_shows_exactly_its_public_fields_and_never_its_account(): void
    {
        $listing = $this->makeListing([
            'district' => 'حي', 'price' => '٥٠ للساعة', 'social' => 'princess.nails', 'held_for' => null,
        ]);
        $res = $this->getJson("/api/v1/listings/{$listing->id}")->assertOk();

        $this->assertSame(
            ['id', 'name', 'title', 'category', 'country', 'city', 'district', 'description', 'price', 'whatsapp', 'phone', 'social', 'published_at', 'photo'],
            array_keys($res->json()),
        );
        foreach (['name', 'title', 'category', 'country', 'city', 'district', 'description', 'price', 'whatsapp', 'phone', 'social'] as $field) {
            $this->assertSame($listing->getAttribute($field), $res->json($field), $field);
        }
        $this->assertSame($listing->published_at->toIso8601ZuluString(), $res->json('published_at'));

        $email = $listing->user->email;
        foreach (["/api/v1/listings/{$listing->id}", '/api/v1/listings?country='.$listing->country] as $url) {
            $this->assertStringNotContainsString($email, $this->getJson($url)->getContent(), $url);
        }
    }

    // ── Filters: each must change the result set ───────────────────────────────────────

    public function test_country_category_and_search_each_narrow_the_result_set_and_every_row_matches(): void
    {
        $tag = 'وسم';
        $this->makeListing(['country' => $this->countryA, 'category' => $this->catA, 'title' => "عنوان $tag"]);
        $this->makeListing(['country' => $this->countryA, 'category' => $this->catB, 'title' => "عنوان $tag"]);
        $this->makeListing(['country' => $this->countryA, 'category' => $this->catA, 'title' => "خاص {$tag}abcx"]);
        $this->makeListing(['country' => $this->countryB, 'category' => $this->catA, 'title' => "عنوان $tag"]);
        $this->makeListing(['country' => $this->countryA, 'category' => $this->catB, 'title' => 'بلا علامة', 'description' => 'بلا علامة', 'city' => "مدينة-{$tag}city"]);
        $this->makeListing(['country' => $this->countryA, 'category' => $this->catB, 'title' => 'بلا علامة', 'description' => 'بلا علامة', 'district' => "حي-{$tag}dist"]);

        $rows = fn (array $q) => $this->getJson('/api/v1/listings?'.http_build_query($q))->assertOk()->json('items');

        // country
        $inA = $rows(['country' => $this->countryA, 'q' => $tag]);
        $inB = $rows(['country' => $this->countryB, 'q' => $tag]);
        $this->assertNotEmpty($inA);
        $this->assertNotEmpty($inB);
        $this->assertSame([$this->countryA], array_values(array_unique(array_column($inA, 'country'))));
        $this->assertSame([$this->countryB], array_values(array_unique(array_column($inB, 'country'))));
        $this->assertSame(Listing::count(), count($inA) + count($inB), 'the two countries partition the rows');

        // category
        $catA = $rows(['country' => $this->countryA, 'category' => $this->catA, 'q' => $tag]);
        $this->assertNotEmpty($catA);
        $this->assertLessThan(count($inA), count($catA), 'the category filter must narrow');
        $this->assertSame([$this->catA], array_values(array_unique(array_column($catA, 'category'))));

        // search: narrower than the tag, and matching on city and district alone
        $special = $rows(['country' => $this->countryA, 'q' => "{$tag}abcx"]);
        $this->assertCount(1, $special);
        $byCity = $rows(['country' => $this->countryA, 'q' => "{$tag}city"]);
        $this->assertCount(1, $byCity, 'search must find a listing by its city');
        $this->assertStringContainsString("{$tag}city", $byCity[0]['city']);
        $byDistrict = $rows(['country' => $this->countryA, 'q' => "{$tag}dist"]);
        $this->assertCount(1, $byDistrict, 'search must find a listing by its district');
        $this->assertStringContainsString("{$tag}dist", $byDistrict[0]['district']);
    }

    public function test_search_text_is_literal_wildcards_and_the_escape_character_match_only_themselves(): void
    {
        $plain = $this->makeListing(['title' => 'نصabcx']);
        $marked = $this->makeListing(['title' => 'نص%_!x']);

        $this->assertSame([$marked->id], $this->board(['country' => $this->countryA, 'q' => '%_!x']));
        $this->assertSame([], $this->board(['country' => $this->countryA, 'q' => 'نص%x']));
        $this->assertSame([], $this->board(['country' => $this->countryA, 'q' => 'نصa_cx']));
        $this->assertSame([], $this->board(['country' => $this->countryA, 'q' => 'نص!abcx']));
        $this->assertSame([$plain->id], $this->board(['country' => $this->countryA, 'q' => 'نصabcx']));
    }

    public function test_a_search_that_names_a_category_finds_its_listings_whatever_their_words(): void
    {
        // a category whose name has a hamza, so the "typed without it" case is real
        $slug = collect(config('princess.categories'))->search(fn (string $label) => preg_match('/[أإآ]/u', $label) === 1);
        $label = config("princess.categories.$slug");
        $listing = $this->makeListing(['category' => $slug, 'title' => 'عنوان', 'description' => 'وصف']);
        $this->assertStringNotContainsString($label, "{$listing->title} {$listing->description}", 'the listing text must not contain the name');

        $this->assertTrue($this->boardHas($listing->id, $label), 'its category name');
        $this->assertTrue($this->boardHas($listing->id, str_replace(['أ', 'إ', 'آ'], 'ا', $label)), 'its category name without the hamza');
        $other = collect(config('princess.categories'))
            ->first(fn (string $l, string $s) => $s !== $slug && ! in_array($slug, ArabicFold::categoriesNamedIn($l), true));
        $this->assertFalse($this->boardHas($listing->id, $other), 'another category name does not find it');
        // quotes, commas and brackets around the name change nothing
        $this->assertTrue($this->boardHas($listing->id, "{$label}\",x)("), 'odd characters around a category name');
    }

    public function test_a_search_finds_a_listing_however_its_words_are_spelled(): void
    {
        // written with the spellings a search often does not repeat: ة, a hamza on the alef
        $listing = $this->makeListing(['city' => 'القاهرة', 'district' => 'مدينة نصر', 'title' => 'إطلالة']);

        foreach (['القاهرة', 'مدينة نصر', 'إطلالة'] as $word) {
            $typed = ArabicFold::fold($word);
            $this->assertNotSame($word, $typed, "the folded form of $word must differ, or this proves nothing");
            $this->assertSame([], ArabicFold::categoriesNamedIn($typed), "$typed must not name a category, or a category match could pass it");
            $this->assertTrue($this->boardHas($listing->id, $word), "as written: $word");
            $this->assertTrue($this->boardHas($listing->id, $typed), "folded: $typed");
        }
    }

    public function test_the_stored_search_text_follows_every_change_to_the_listing(): void
    {
        $listing = $this->makeListing(['city' => 'الرياض']);
        $this->assertTrue($this->boardHas($listing->id, 'الرياض'));

        $listing->update(['city' => 'جدة']);
        $this->assertTrue($this->boardHas($listing->id, 'جده'), 'the new city, folded');
        $this->assertFalse($this->boardHas($listing->id, 'الرياض'), 'the old city is gone');
    }

    // ── Order, limit and total ─────────────────────────────────────────────────────────

    public function test_the_board_is_ordered_by_publication_not_by_creation(): void
    {
        $now = Carbon::now();
        $writtenFirst = $this->makeListing(['created_at' => $now->copy()->subDays(3), 'published_at' => $now->copy()->subHour()]);
        $writtenLast = $this->makeListing(['created_at' => $now->copy()->subDay(), 'published_at' => $now->copy()->subHours(5)]);

        $this->assertSame([$writtenFirst->id, $writtenLast->id], $this->board(['country' => $this->countryA]));
    }

    public function test_listings_published_at_the_same_moment_keep_one_order(): void
    {
        $at = Carbon::now()->startOfSecond();
        $ids = collect(range(1, 4))->map(fn () => $this->makeListing(['published_at' => $at])->id)->sort()->values()->all();

        $this->assertSame($ids, $this->board(['country' => $this->countryA]));
    }

    public function test_a_limit_returns_the_newest_n_and_the_total_counts_all_that_match_the_same_filters(): void
    {
        $now = Carbon::now();
        foreach (range(0, 4) as $i) {
            $this->makeListing(['title' => "صفحة $i", 'published_at' => $now->copy()->subMinutes($i)]);
        }
        $this->makeListing(['title' => 'خارج', 'category' => $this->catB]);

        $all = $this->getJson('/api/v1/listings?'.http_build_query(['country' => $this->countryA, 'q' => 'صفحة']))->assertOk();
        $this->assertCount(5, $all->json('items'));
        $firstTwo = $this->getJson('/api/v1/listings?'.http_build_query(['country' => $this->countryA, 'q' => 'صفحة', 'limit' => 2]))->assertOk();
        $this->assertSame(array_slice(array_column($all->json('items'), 'id'), 0, 2), array_column($firstTwo->json('items'), 'id'), 'the limit takes the newest, in the same order');
        $this->assertSame(5, $firstTwo->json('total'), 'the total ignores the limit');
        $this->getJson('/api/v1/listings?'.http_build_query(['country' => $this->countryA, 'category' => $this->catB, 'q' => 'صفحة']))
            ->assertOk()->assertJsonPath('total', 0);
    }

    public function test_without_a_limit_the_board_loads_one_page(): void
    {
        $pageSize = config('princess.board.page_size');
        foreach (range(1, $pageSize + 1) as $i) {
            $this->makeListing();
        }

        $res = $this->getJson('/api/v1/listings?country='.$this->countryA)->assertOk();
        $this->assertCount($pageSize, $res->json('items'));
        $this->assertSame($pageSize + 1, $res->json('total'));
    }

    // ── Others ─────────────────────────────────────────────────────────────────────────

    public function test_others_are_the_newest_published_in_the_same_country_and_category_never_the_listing_itself(): void
    {
        $now = Carbon::now();
        $max = config('princess.board.others');
        $listing = $this->makeListing(['published_at' => $now]);
        $same = collect(range(1, $max + 2))
            ->map(fn (int $i) => $this->makeListing(['published_at' => $now->copy()->subMinutes($i)])->id)
            ->all();
        $this->makeListing(['category' => $this->catB]);
        $this->makeListing(['country' => $this->countryB]);
        $this->makeListing(['status' => ListingStatus::Pending, 'published_at' => null]);

        $others = array_column($this->getJson("/api/v1/listings/{$listing->id}/others")->assertOk()->json('items'), 'id');
        $this->assertSame(array_slice($same, 0, $max), $others);
    }

    // ── Validation answers with codes ──────────────────────────────────────────────────

    public function test_filters_are_validated_and_refused_with_one_code_per_field(): void
    {
        $maxQuery = config('princess.board.max_query');
        $maxLimit = config('princess.board.max_limit');
        $cases = [
            [[], ['country' => 'required']],
            [['country' => 'XX'], ['country' => 'invalid']],
            [['country' => $this->countryA, 'category' => 'not-a-category'], ['category' => 'invalid']],
            [['country' => $this->countryA, 'category' => config("princess.categories.{$this->catA}")], ['category' => 'invalid']],
            [['country' => $this->countryA, 'q' => str_repeat('ب', $maxQuery + 1)], ['q' => 'too_long']],
            [['country' => $this->countryA, 'q' => ['a']], ['q' => 'invalid']],
            [['country' => $this->countryA, 'limit' => 0], ['limit' => 'invalid']],
            [['country' => $this->countryA, 'limit' => $maxLimit + 1], ['limit' => 'invalid']],
            [['country' => $this->countryA, 'limit' => 'ten'], ['limit' => 'invalid']],
        ];
        foreach ($cases as [$query, $errors]) {
            $this->getJson('/api/v1/listings?'.http_build_query($query))
                ->assertStatus(422)
                ->assertExactJson(['errors' => $errors]);
        }

        // the limits themselves are allowed
        $this->getJson('/api/v1/listings?'.http_build_query(['country' => $this->countryA, 'q' => str_repeat('ب', $maxQuery), 'limit' => $maxLimit]))->assertOk();
    }
}
