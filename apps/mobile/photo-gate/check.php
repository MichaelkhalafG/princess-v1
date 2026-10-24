<?php
// The photo gate, the check: what a file still carries. The same standard as the web's gate
// (apps/api/tests/Feature/PhotoPrivacyTest.php): PHP's EXIF reader finds no GPS, and the bytes
// hold no EXIF, XMP or IPTC block and none of the planted values.
// Usage: php check.php file.jpg [file.jpg ...]
foreach (array_slice($argv, 1) as $path) {
    $bytes = file_get_contents($path);
    $exif = @exif_read_data($path, null, true);
    $size = getimagesize($path);
    $gps = $exif['GPS'] ?? null;
    $hits = [];
    foreach ([
        'EXIF block (APP1 "Exif")' => "Exif\0\0",
        'XMP block' => 'http://ns.adobe.com/xap/1.0/',
        'XMP GPS value' => '30,2.675N',
        'IPTC block (Photoshop 3.0)' => 'Photoshop 3.0',
        'IPTC caption ("Home, Cairo")' => 'Home, Cairo',
        'GPS latitude rationals' => pack('VV', 405, 10),
        'GPS longitude rationals' => pack('VV', 86, 10),
    ] as $what => $needle) {
        if (str_contains($bytes, $needle)) $hits[] = $what;
    }
    // every APPn segment before the image data, by marker
    $segments = [];
    for ($i = 2; $i + 4 <= strlen($bytes) && $bytes[$i] === "\xFF"; ) {
        $marker = ord($bytes[$i + 1]);
        if ($marker === 0xDA) break; // start of scan
        $len = unpack('n', substr($bytes, $i + 2, 2))[1];
        $segments[] = sprintf('FF%02X(%d)', $marker, $len);
        $i += 2 + $len;
    }
    printf("%s\n  %d bytes, %dx%d, orientation tag: %s\n  segments before the image: %s\n  EXIF reader GPS: %s\n  found in the bytes: %s\n  VERDICT: %s\n\n",
        basename($path), strlen($bytes), $size[0], $size[1],
        $exif['IFD0']['Orientation'] ?? 'none',
        implode(' ', $segments) ?: 'none',
        $gps ? json_encode(array_intersect_key($gps, array_flip(['GPSLatitude', 'GPSLongitude']))) : 'none',
        $hits ? implode(', ', $hits) : 'nothing',
        ($gps || $hits) ? 'CARRIES METADATA' : 'CLEAN');
}
