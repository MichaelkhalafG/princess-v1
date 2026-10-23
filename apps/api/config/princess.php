<?php

// The listing rules the API enforces. They mirror packages/shared/src/constants.ts, which the
// web form and the app use for their inline messages; the shared case file holds the two
// together. Category labels are here because a search that names a category finds it.

return [

    'categories' => [
        'hairdressing' => 'كوافير وتجميل',
        'makeup' => 'مكياج',
        'nails' => 'أظافر',
        'henna' => 'حنّة',
        'tailoring' => 'خياطة وتفصيل',
        'clothes-for-sale' => 'بيع ملابس',
        'cooking-and-desserts' => 'طبخ وحلويات',
        'private-tutoring' => 'دروس خصوصية',
        'cleaning' => 'تنظيف منازل',
        'childcare' => 'رعاية أطفال',
        'elderly-care' => 'رعاية كبار السن',
    ],

    // A number she types after the dialling code: its length and first digit.
    'countries' => [
        'EG' => ['dial' => '+20', 'length' => 10, 'lead' => '1'],
        'SA' => ['dial' => '+966', 'length' => 9, 'lead' => '5'],
        'AE' => ['dial' => '+971', 'length' => 9, 'lead' => '5'],
    ],

    // Characters (code points), as the form counts them.
    'limits' => [
        'name' => 40,
        'title' => 80,
        'description' => 600,
        'price' => 40,
    ],

    'board' => [
        // what the board loads at a time, and the most one request may ask for
        'page_size' => 24,
        'max_limit' => 480,
        // other listings shown under a listing
        'others' => 12,
        // long enough for any real search
        'max_query' => 100,
    ],

    // Where the links in emails point: the web app, which passes their parameters to the API.
    'web_url' => rtrim(env('PRINCESS_WEB_URL', 'http://localhost:3000'), '/'),

    'accounts' => [
        // an account whose email is never verified is deleted, with its listing, after this
        'unverified_days' => 7,
        'verification_link_hours' => 24,
        'password_min_chars' => 8,
        // bcrypt reads no further than 72 bytes; a longer password would be cut without a word
        'password_max_bytes' => 72,
    ],

    // Line B: an account's listings wait for a moderator until one of them has been approved
    // (and none removed since); after that they publish at once unless a signal holds them.
    'moderation' => [
        // every listing waits for a moderator, trusted or not, until this is switched off
        'launch_phase' => (bool) env('MODERATION_LAUNCH_PHASE', true),

        // The filter (App\Moderation\Signals). A signal never refuses a listing: it sends it to a
        // moderator instead of straight onto the board.
        // DRAFT, to be rewritten: words that send a listing to review. Matched as whole words after
        // the Arabic fold, with "و", "ال", "بال"... in front still matching.
        'banned_words' => [
            'جنس', 'سكس', 'دعارة', 'مساج للرجال', 'مساج رجالي', 'مخدرات', 'حشيش', 'ترامادول',
            'سلاح', 'اسلحة', 'قمار', 'مراهنات', 'sex', 'escort', 'porn', 'xxx', 'casino',
        ],
        // this many listings from one account within 24 hours (counting the new one) is a signal
        'many_listings_per_day' => 3,

        // DRAFT, to be rewritten: why a visitor reports a listing. The web app words them for her;
        // these labels are for the admin.
        'report_reasons' => [
            'scam' => 'Scam or fraud',
            'offensive' => 'Offensive or inappropriate',
            'wrong_contact' => 'The number is not hers',
            'misleading' => 'Misleading',
            'spam' => 'Spam or repeated',
            'other' => 'Other',
        ],
        // a report's note, in characters
        'report_note_max' => 500,
        // Hide a listing from the board (back to the queue) once it has this many open reports.
        // Off (0) by default: a competitor could take a rival's listing down with a few reports.
        'auto_hide_reports' => (int) env('MODERATION_AUTO_HIDE_REPORTS', 0),

        // Email to the moderators: new reports, and a queue that has waited too long. Unset: the
        // alerts are only written to the log.
        'alert_email' => env('MODERATION_ALERT_EMAIL'),
        'alert_backlog_hours' => 24,

        // DRAFT, to be rewritten: why a moderator refuses or removes a listing. The codes reach her
        // listings page, which words them (the web app); these labels are for the admin.
        'reasons' => [
            'not_a_service' => 'Not a service or product offered by a woman',
            'prohibited' => 'Prohibited content',
            'misleading' => 'Misleading or false',
            'contact' => 'Contact details wrong or not hers',
            'duplicate' => 'Duplicate',
            'photo' => 'Unsuitable photo',
            'other' => 'Other',
        ],
    ],

    'posting' => [
        // listings one account may create in any 24 hours, whatever becomes of them
        'per_day' => 5,
    ],

    // One photo per listing, re-encoded on the server whatever arrives: decoded, turned upright,
    // shrunk, written as a fresh JPEG. Nothing she uploaded is stored as it came, so no
    // metadata (GPS, camera, XMP, IPTC) survives. Pending photos are private; a photo is public
    // exactly while its listing is published.
    'photos' => [
        'max_bytes' => 5 * 1024 * 1024,
        // the longest side kept, as the web form already shrinks to
        'max_edge' => 1600,
        'jpeg_quality' => 85,
        // refused from the header alone above this. Measured in a fresh process (the app booted,
        // about 32 MB): a 12-megapixel phone photo peaks at 96 MB, 4096 × 4096 at 118 MB
        'max_pixels' => 4096 * 4096,
        // the upload request raises its own memory limit to this (never lowers it), to leave room
        // above those peaks; a host that refuses still fits a 12-megapixel photo in 128 MB
        'memory_limit' => env('PHOTOS_MEMORY_LIMIT', '192M'),
        // an upload that no listing claims is deleted after this
        'unclaimed_hours' => 24,
        // the photo of a rejected or removed listing, kept privately for the moderators, then deleted
        'refused_days' => 14,
        // how long the signed address of a private photo works (her listings page, the admin)
        'private_link_minutes' => 60,
        // where the files live: PHOTOS_ROOT, read by the photos_private and photos_public disks
        // (config/filesystems.php), outside the code so a deploy never touches them
        // the public address of a published photo; a CDN can go here later
        'public_url' => rtrim((string) (env('PHOTOS_PUBLIC_URL') ?: rtrim((string) env('APP_URL', 'http://localhost'), '/').'/photos'), '/'),
    ],

    // Abuse limits on the endpoints that create, sign in or send email.
    'rate_limits' => [
        'photo_uploads_per_ip_per_hour' => 30,
        'reports_per_ip_per_hour' => 10,
        'accounts_per_ip_per_hour' => 10,
        'logins_per_minute' => 5,
        'password_emails_per_ip_per_hour' => 5,
        'verification_emails_per_hour' => 6,
    ],

    // The visitor's real address behind a proxy or CDN. Both unset: the address the request
    // came from is used and no header is trusted. Set both once the host's proxy is known:
    // the header it writes (X-Forwarded-For, X-Real-IP, CF-Connecting-IP...) and the
    // addresses or ranges it sends from, comma separated. The header is believed only on a
    // request that arrives from one of those addresses.
    'client_ip' => [
        'header' => env('CLIENT_IP_HEADER'),
        'trusted_proxies' => env('CLIENT_IP_TRUSTED_PROXIES'),
    ],

];
