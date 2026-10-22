<?php

namespace Tests\Unit;

use App\Support\ArabicFold;
use Tests\TestCase;

// Ported from the web app's tests/unit/search.test.ts, with the same cases.
class ArabicFoldTest extends TestCase
{
    public function test_folding_makes_the_usual_spelling_differences_compare_equal(): void
    {
        $this->assertSame(ArabicFold::fold('أظافر'), ArabicFold::fold('اظافر'));
        $this->assertSame(ArabicFold::fold('إيمان'), ArabicFold::fold('ايمان'));
        $this->assertSame(ArabicFold::fold('حنّة'), ArabicFold::fold('حنه'));
        $this->assertSame(ArabicFold::fold('مستشفى'), ArabicFold::fold('مستشفي'));
        $this->assertSame(ArabicFold::fold('جـــل'), ArabicFold::fold('جل'));
        $this->assertSame(ArabicFold::fold('  رعاية   أطفال '), ArabicFold::fold('رعاية أطفال'));
    }

    public function test_every_category_is_found_by_its_own_name_typed_with_or_without_hamza_and_diacritics(): void
    {
        foreach (config('princess.categories') as $slug => $label) {
            $this->assertContains($slug, ArabicFold::categoriesNamedIn($label), $label);
            $plain = str_replace(['أ', 'إ', 'آ', "\u{0651}"], ['ا', 'ا', 'ا', ''], $label);
            $this->assertContains($slug, ArabicFold::categoriesNamedIn($plain), $plain);
        }
    }

    public function test_a_search_that_contains_a_category_name_or_is_part_of_one_names_it(): void
    {
        $nails = array_search('أظافر', config('princess.categories'), true);
        $this->assertSame([$nails], ArabicFold::categoriesNamedIn('أظافر جل في البيت'));

        $care = ArabicFold::categoriesNamedIn('رعاية');
        $this->assertGreaterThanOrEqual(2, count($care));
        foreach ($care as $slug) {
            $this->assertStringContainsString('رعاية', config("princess.categories.$slug"));
        }
    }

    public function test_short_or_unrelated_searches_name_no_category(): void
    {
        $this->assertSame([], ArabicFold::categoriesNamedIn('حن'));
        $this->assertSame([], ArabicFold::categoriesNamedIn('ساعات يد'));
        $this->assertSame([], ArabicFold::categoriesNamedIn('%_'));
    }

    public function test_white_space_is_the_set_javascript_uses(): void
    {
        // no-break space and ideographic space are white space to JavaScript's \s; the zero
        // width space is not, so it stays
        $this->assertSame('ا ب', ArabicFold::fold("\u{00A0}ا\u{3000}\u{2003}ب\u{FEFF}"));
        $this->assertSame("ا\u{200B}ب", ArabicFold::fold("ا\u{200B}ب"));
    }
}
