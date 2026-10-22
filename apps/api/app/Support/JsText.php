<?php

namespace App\Support;

/**
 * Text handled the way the web form's JavaScript handles it, so the API and the form agree on
 * what she typed: white space is exactly the set JavaScript's \s and trim() use, written out,
 * so nothing depends on how PCRE was built.
 */
final class JsText
{
    /** A regular-expression class body (use inside [...] with the /u flag). */
    public const SPACE = '\t\n\x{0B}\f\r \x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}';

    /** String.prototype.trim(). */
    public static function trim(string $text): string
    {
        return preg_replace('/^['.self::SPACE.']+|['.self::SPACE.']+$/u', '', $text) ?? '';
    }

    /** Length in code points, as [...s].length counts it (and as the form counts it). */
    public static function length(string $text): int
    {
        return mb_strlen($text, 'UTF-8');
    }
}
