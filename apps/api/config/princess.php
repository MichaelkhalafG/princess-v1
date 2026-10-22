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
    ],

    'posting' => [
        // listings one account may create in any 24 hours, whatever becomes of them
        'per_day' => 5,
    ],

    // Abuse limits on the endpoints that create, sign in or send email.
    'rate_limits' => [
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
