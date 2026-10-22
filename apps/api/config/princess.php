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

];
