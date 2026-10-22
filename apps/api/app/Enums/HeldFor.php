<?php

namespace App\Enums;

/** Why a listing waits for a moderator instead of publishing on its own. */
enum HeldFor: string
{
    /** Her account has no listing a moderator has approved yet. */
    case FirstListing = 'first_listing';

    /** The launch phase: every listing is reviewed until the filter has been measured. */
    case Launch = 'launch';

    /** A signal fired on this listing (the signals themselves come with the filter). */
    case Signal = 'signal';
}
