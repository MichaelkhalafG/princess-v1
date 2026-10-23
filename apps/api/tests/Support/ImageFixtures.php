<?php

namespace Tests\Support;

use GdImage;

/**
 * Real image files carrying the metadata a phone writes: GPS coordinates, an orientation tag,
 * XMP and IPTC. Built byte by byte from a GD image, so the tests depend on nothing outside PHP.
 * The tests check that each file really carries the data before checking it is gone.
 */
final class ImageFixtures
{
    /** Cairo, 30°02'40.5"N 31°14'08.6"E, as EXIF rationals. */
    public const LATITUDE = [[30, 1], [2, 1], [405, 10]];

    public const LONGITUDE = [[31, 1], [14, 1], [86, 10]];

    /**
     * A picture whose top-left quarter is red, top-right quarter green, and bottom half blue, so a
     * test can tell which way it was turned or mirrored from its four corners.
     */
    public static function picture(int $width, int $height): GdImage
    {
        $image = imagecreatetruecolor($width, $height);
        imagefill($image, 0, 0, imagecolorallocate($image, 0, 0, 255));
        imagefilledrectangle($image, 0, 0, intdiv($width, 2) - 1, intdiv($height, 2) - 1, imagecolorallocate($image, 255, 0, 0));
        imagefilledrectangle($image, intdiv($width, 2), 0, $width - 1, intdiv($height, 2) - 1, imagecolorallocate($image, 0, 255, 0));

        return $image;
    }

    /**
     * An EXIF block (TIFF, little endian): IFD0 with Orientation and a pointer to a GPS IFD
     * holding latitude and longitude.
     */
    public static function exifTiff(int $orientation = 1): string
    {
        $entry = fn (int $tag, int $type, int $count, string $value) => pack('vvV', $tag, $type, $count).str_pad($value, 4, "\0");
        $rationals = fn (array $parts) => implode('', array_map(fn (array $r) => pack('VV', $r[0], $r[1]), $parts));

        $ifd0 = 8;
        $gps = $ifd0 + 2 + 2 * 12 + 4;          // 38
        $gpsData = $gps + 2 + 5 * 12 + 4;       // 104
        $tiff = 'II'.pack('vV', 42, $ifd0);
        $tiff .= pack('v', 2)
            .$entry(0x0112, 3, 1, pack('v', $orientation))
            .$entry(0x8825, 4, 1, pack('V', $gps))
            .pack('V', 0);
        $tiff .= pack('v', 5)
            .$entry(0x0000, 1, 4, "\x02\x03\x00\x00")
            .$entry(0x0001, 2, 2, "N\0")
            .$entry(0x0002, 5, 3, pack('V', $gpsData))
            .$entry(0x0003, 2, 2, "E\0")
            .$entry(0x0004, 5, 3, pack('V', $gpsData + 24))
            .pack('V', 0);

        return $tiff.$rationals(self::LATITUDE).$rationals(self::LONGITUDE);
    }

    /** A JPEG with EXIF (GPS, orientation), XMP (GPS again) and IPTC (a caption) after the SOI. */
    public static function jpeg(int $width = 2400, int $height = 1800, int $orientation = 6): string
    {
        ob_start();
        imagejpeg(self::picture($width, $height), null, 90);
        $plain = ob_get_clean();

        $segment = fn (int $marker, string $body) => "\xFF".chr($marker).pack('n', strlen($body) + 2).$body;
        $xmp = '<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">'
            .'<rdf:Description xmlns:exif="http://ns.adobe.com/exif/1.0/" exif:GPSLatitude="30,2.675N" exif:GPSLongitude="31,14.143E"/>'
            .'</rdf:RDF></x:xmpmeta>';
        $caption = 'Home, Cairo';
        $iptc = "\x1C\x02\x78".pack('n', strlen($caption)).$caption;
        $irb = '8BIM'.pack('n', 0x0404)."\0\0".pack('N', strlen($iptc)).$iptc.(strlen($iptc) % 2 ? "\0" : '');

        return "\xFF\xD8"
            .$segment(0xE1, "Exif\0\0".self::exifTiff($orientation))
            .$segment(0xE1, "http://ns.adobe.com/xap/1.0/\0".$xmp)
            .$segment(0xED, "Photoshop 3.0\0".$irb)
            .substr($plain, 2);
    }

    /** A PNG with an eXIf chunk (the same EXIF block) and a tEXt chunk naming the place. */
    public static function png(int $width = 2000, int $height = 1500): string
    {
        ob_start();
        imagepng(self::picture($width, $height));
        $plain = ob_get_clean();

        $chunk = fn (string $type, string $data) => pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));
        // signature (8) + IHDR (4 + 4 + 13 + 4 = 25): the metadata goes straight after IHDR
        $afterIhdr = 8 + 25;

        return substr($plain, 0, $afterIhdr)
            .$chunk('eXIf', self::exifTiff())
            .$chunk('tEXt', "Comment\0GPS 30.0444,31.2357 Cairo")
            .substr($plain, $afterIhdr);
    }

    /** An extended WebP: VP8X with the EXIF flag, the image, and an EXIF chunk. */
    public static function webp(int $width = 2000, int $height = 1500): string
    {
        ob_start();
        imagewebp(self::picture($width, $height), null, 80);
        $plain = ob_get_clean();

        $image = substr($plain, 12); // the image chunk, after "RIFF" size "WEBP"
        $chunk = fn (string $type, string $data) => $type.pack('V', strlen($data)).$data.(strlen($data) % 2 ? "\0" : '');
        $canvas = fn (int $n) => substr(pack('V', $n - 1), 0, 3);
        $vp8x = $chunk('VP8X', chr(0x08)."\0\0\0".$canvas($width).$canvas($height));
        $body = 'WEBP'.$vp8x.$image.$chunk('EXIF', self::exifTiff());

        return 'RIFF'.pack('V', strlen($body)).$body;
    }

    /**
     * A PNG that declares an enormous picture: just a header, no pixels. Decoding it would
     * need gigabytes; it must be refused from its header alone.
     */
    public static function hugePngHeader(int $width = 30000, int $height = 30000): string
    {
        $chunk = fn (string $type, string $data) => pack('N', strlen($data)).$type.$data.pack('N', crc32($type.$data));

        return "\x89PNG\r\n\x1A\n".$chunk('IHDR', pack('NNCCCCC', $width, $height, 8, 2, 0, 0, 0)).$chunk('IEND', '');
    }
}
