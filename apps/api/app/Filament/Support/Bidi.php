<?php

namespace App\Filament\Support;

/**
 * Arabic in an English admin. Text she wrote (a title, a description, a report's note) takes its
 * direction from its own first letter instead of the page's left to right, so full stops,
 * numbers and handles stay where she put them. Without it, a description with a number in it
 * comes out scrambled.
 */
final class Bidi
{
    /** For text that wraps (a description, a note): in its own direction, aligned the way it reads. */
    public const AUTO = ['dir' => 'auto'];

    /** For a one-line value (a title, a name, a city): in its own direction, under its label on the left. */
    public const SHORT = ['dir' => 'auto', 'style' => 'text-align: left'];

    /** Her text inside a line of English: kept as one piece, in its own direction (FSI … PDI). */
    public static function isolate(?string $text): string
    {
        return $text === null ? '' : "\u{2068}{$text}\u{2069}";
    }
}
