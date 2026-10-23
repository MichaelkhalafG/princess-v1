<?php

namespace Tests\Unit;

use App\Moderation\Signals;
use Tests\TestCase;

// The two text checks of the filter, on their own.
class SignalsTextTest extends TestCase
{
    public function test_a_banned_word_counts_as_a_whole_word_with_or_without_a_prefix(): void
    {
        config(['princess.moderation.banned_words' => ['جنس', 'مساج للرجال', 'sex']]);

        $this->assertTrue(Signals::hasBannedWord('خدمات جنس'));
        $this->assertTrue(Signals::hasBannedWord('والجنس'), 'with و and ال in front');
        $this->assertTrue(Signals::hasBannedWord('مساج للرجال في البيت'), 'a phrase');
        $this->assertTrue(Signals::hasBannedWord('SEX'), 'Latin in any case');
        $this->assertFalse(Signals::hasBannedWord('جنسية مصرية'), 'part of another word is not the word');
        $this->assertFalse(Signals::hasBannedWord('مساج للسيدات'), 'half a phrase is not the phrase');
        $this->assertFalse(Signals::hasBannedWord('Sussex'));
    }

    public function test_a_number_a_link_or_a_handle_in_the_text_counts_and_a_price_does_not(): void
    {
        foreach (['اتصلي على 01012345678', '0101 234 5678', '٠١٠١٢٣٤٥٦٧٨', '(010) 1234-5678', 'www.example.com', 'https://x.y/z', 'wa.me/201012345678', 'princess-nails.com', 'تابعيني @princess.nails'] as $text) {
            $this->assertTrue(Signals::hasContactInText($text), $text);
        }
        foreach (['السعر 1500 - 2000 جنيه', '٥٠ للساعة', 'خبرة 10 سنوات، 3 أيام في الأسبوع', 'شعر طويل.قص'] as $text) {
            $this->assertFalse(Signals::hasContactInText($text), $text);
        }
    }
}
