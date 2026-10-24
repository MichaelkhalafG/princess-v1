<?php
// The photo gate's inputs, built with the API's own fixtures (apps/api/tests/Support/ImageFixtures.php):
//   gps-real.jpg     a real camera photo (the web's hero/cooking.jpg, from Pexels) with what a phone
//                    writes added after its SOI: EXIF (orientation 1, GPS Cairo), XMP (GPS), IPTC (place)
//   gps-rotated.jpg  the fixtures' four-colour picture, 2400×1800, EXIF orientation 6 (turn 90° clockwise), GPS
// Each is checked to really carry GPS before it is used.
require __DIR__.'/../../api/vendor/autoload.php';

use Tests\Support\ImageFixtures;

$out = $argv[1] ?? __DIR__.'/out';
@mkdir($out, 0777, true);
$photo = file_get_contents(__DIR__.'/../../web/public/hero/cooking.jpg');
$segment = fn (int $marker, string $body) => "\xFF".chr($marker).pack('n', strlen($body) + 2).$body;
$xmp = '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
    .'<rdf:Description xmlns:exif="http://ns.adobe.com/exif/1.0/" exif:GPSLatitude="30,2.675N" exif:GPSLongitude="31,14.143E"/>'
    .'</rdf:RDF></x:xmpmeta>';
$caption = 'Home, Cairo';
$iptc = "\x1C\x02\x78".pack('n', strlen($caption)).$caption;
$irb = '8BIM'.pack('n', 0x0404)."\0\0".pack('N', strlen($iptc)).$iptc.(strlen($iptc) % 2 ? "\0" : '');
$real = "\xFF\xD8"
    .$segment(0xE1, "Exif\0\0".ImageFixtures::exifTiff(1))
    .$segment(0xE1, "http://ns.adobe.com/xap/1.0/\0".$xmp)
    .$segment(0xED, "Photoshop 3.0\0".$irb)
    .substr($photo, 2);
file_put_contents("$out/gps-real.jpg", $real);
file_put_contents("$out/gps-rotated.jpg", ImageFixtures::jpeg(2400, 1800, 6));

foreach (['gps-real.jpg', 'gps-rotated.jpg'] as $f) {
    $exif = @exif_read_data("$out/$f");
    $size = getimagesize("$out/$f");
    printf("%-16s %7d bytes  %dx%d  GPS lat=%s lon=%s  orientation=%s  XMP=%s  IPTC=%s\n",
        $f, filesize("$out/$f"), $size[0], $size[1],
        isset($exif['GPSLatitude']) ? json_encode($exif['GPSLatitude']) : 'NONE',
        isset($exif['GPSLongitude']) ? json_encode($exif['GPSLongitude']) : 'NONE',
        $exif['Orientation'] ?? 'NONE',
        str_contains(file_get_contents("$out/$f"), 'http://ns.adobe.com/xap/1.0/') ? 'yes' : 'no',
        str_contains(file_get_contents("$out/$f"), 'Home, Cairo') ? 'yes' : 'no');
}
