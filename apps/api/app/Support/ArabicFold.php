<?php

namespace App\Support;

use Normalizer;

/**
 * Arabic spelling, folded so the same word typed differently compares equal: no diacritics
 * or tatweel, every alef form as ا, ى as ي, ة as ه, runs of white space as one space, Latin
 * in lower case. Listings store their text folded (search_text) and searches are folded
 * the same way, so "مدينه نصر" finds "مدينة نصر".
 *
 * A port of the web app's foldArabic. White space is the exact set JavaScript's \s and
 * trim() use, written out, so the result does not depend on how PCRE was built.
 */
final class ArabicFold
{
    private const LETTERS = [
        "\u{0622}" => "\u{0627}", // آ → ا
        "\u{0623}" => "\u{0627}", // أ → ا
        "\u{0625}" => "\u{0627}", // إ → ا
        "\u{0671}" => "\u{0627}", // ٱ → ا
        "\u{0649}" => "\u{064A}", // ى → ي
        "\u{0629}" => "\u{0647}", // ة → ه
    ];

    /** Tashkeel, superscript alef, tatweel. */
    private const MARKS = '/[\x{064B}-\x{065F}\x{0670}\x{0640}]/u';

    private const SPACE = '\t\n\x{0B}\f\r \x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}';

    public static function fold(string $text): string
    {
        $text = Normalizer::normalize($text, Normalizer::FORM_C);
        if ($text === false) {
            return ''; // not valid UTF-8
        }
        $text = preg_replace(self::MARKS, '', $text);
        $text = strtr($text, self::LETTERS);
        $text = preg_replace('/['.self::SPACE.']+/u', ' ', $text);
        $text = preg_replace('/^['.self::SPACE.']+|['.self::SPACE.']+$/u', '', $text);

        return mb_strtolower($text, 'UTF-8');
    }

    /**
     * The categories a search names: the search contains a category's name ("أظافر جل"), or
     * is part of one ("رعاية" → both care categories). Two letters or fewer name nothing.
     *
     * @return list<string> category slugs, in the configured order
     */
    public static function categoriesNamedIn(string $search): array
    {
        $text = self::fold($search);
        if (mb_strlen($text, 'UTF-8') < 3) {
            return [];
        }
        $named = [];
        foreach (config('princess.categories') as $slug => $label) {
            $label = self::fold($label);
            if (str_contains($text, $label) || str_contains($label, $text)) {
                $named[] = $slug;
            }
        }

        return $named;
    }
}
