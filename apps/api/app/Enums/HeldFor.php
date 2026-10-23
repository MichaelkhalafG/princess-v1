<?php

namespace App\Enums;

/** Why a listing waits for a moderator instead of publishing on its own. */
enum HeldFor: string
{
    /** Her account has no listing a moderator has approved yet. */
    case FirstListing = 'first_listing';

    /** The launch phase: every listing is reviewed until the filter has been measured. */
    case Launch = 'launch';

    /** The filter raised a signal on it (App\Moderation\Signals). */
    case Signal = 'signal';

    /** It was on the board and enough reports took it down until a moderator looks (off by default). */
    case Reports = 'reports';
}
