<?php

namespace App\Support;

/** 24 → "٢٤", as the web app writes numbers in its Arabic copy (toArabicDigits). */
final class ArabicDigits
{
    public static function of(int|string $n): string
    {
        return strtr((string) $n, ['0' => '٠', '1' => '١', '2' => '٢', '3' => '٣', '4' => '٤', '5' => '٥', '6' => '٦', '7' => '٧', '8' => '٨', '9' => '٩']);
    }
}
