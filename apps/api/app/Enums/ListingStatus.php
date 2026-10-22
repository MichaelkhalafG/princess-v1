<?php

namespace App\Enums;

/**
 * Where a listing is in its life. Only Published is ever visible to the public: on the board,
 * on its own page, in share previews and as a photo URL.
 */
enum ListingStatus: string
{
    /** Saved with her new account, waiting for her to verify her email. Not in any queue. */
    case Unverified = 'unverified';

    /** Waiting for a moderator (see HeldFor for why). */
    case Pending = 'pending';

    /** On the board. */
    case Published = 'published';

    /** Refused by a moderator before it was ever published. */
    case Rejected = 'rejected';

    /** Taken down by a moderator after it was published. */
    case Removed = 'removed';
}
