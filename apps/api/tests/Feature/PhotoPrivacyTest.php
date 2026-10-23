<?php

namespace Tests\Feature;

use App\Enums\ListingStatus;
use App\Models\Listing;
use App\Models\Photo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\Support\ImageFixtures;
use Tests\TestCase;
use Tests\Unit\ListingCasesTest;

/**
 * THE GATE: no location or other metadata in an upload ever reaches storage. Each input really
 * carries GPS coordinates (checked first, with PHP's own EXIF reader); each goes through the real
 * upload endpoint onto the real disk; the bytes stored, and the bytes served once the listing is
 * published, are then searched for any trace of it.
 */
class PhotoPrivacyTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, array{string}> */
    public static function inputs(): array
    {
        return ['a JPEG with EXIF GPS, XMP and IPTC' => ['jpeg'], 'a PNG with an eXIf chunk' => ['png'], 'a WebP with an EXIF chunk' => ['webp']];
    }

    /** @return array<string, mixed>|false What PHP's EXIF reader finds in a JPEG. */
    private function exifOf(string $jpeg): array|false
    {
        if (! function_exists('exif_read_data')) {
            throw new RuntimeException('PHP\'s exif extension is not loaded, so these tests cannot check their inputs. Run PHPUnit with -d extension=exif.');
        }
        $file = tempnam(sys_get_temp_dir(), 'exif');
        file_put_contents($file, $jpeg);
        try {
            return @exif_read_data($file, null, true);
        } finally {
            unlink($file);
        }
    }

    /** True when PHP's EXIF reader finds Cairo's coordinates in this TIFF block. */
    private function tiffHasGps(string $tiff): bool
    {
        ob_start();
        imagejpeg(ImageFixtures::picture(8, 8));
        $probe = ob_get_clean();
        $exif = $this->exifOf("\xFF\xD8\xFF\xE1".pack('n', strlen($tiff) + 8)."Exif\0\0".$tiff.substr($probe, 2));
        $fraction = fn (array $r) => "{$r[0]}/{$r[1]}";

        return ($exif['GPS']['GPSLatitude'] ?? null) === array_map($fraction, ImageFixtures::LATITUDE)
            && ($exif['GPS']['GPSLongitude'] ?? null) === array_map($fraction, ImageFixtures::LONGITUDE);
    }

    /** @return array<string, list<string>> chunk type => payloads, in a PNG */
    private function pngChunks(string $png): array
    {
        $chunks = [];
        for ($at = 8; $at + 12 <= strlen($png);) {
            $length = unpack('N', substr($png, $at, 4))[1];
            $type = substr($png, $at + 4, 4);
            $data = substr($png, $at + 8, $length);
            $this->assertSame(unpack('N', substr($png, $at + 8 + $length, 4))[1], crc32($type.$data), "the $type chunk's checksum");
            $chunks[$type][] = $data;
            $at += 12 + $length;
        }

        return $chunks;
    }

    /** @return array<string, string> chunk type => payload, in a WebP */
    private function webpChunks(string $webp): array
    {
        $this->assertSame('RIFF', substr($webp, 0, 4));
        $this->assertSame(strlen($webp) - 8, unpack('V', substr($webp, 4, 4))[1], 'the RIFF size');
        $chunks = [];
        for ($at = 12; $at + 8 <= strlen($webp);) {
            $length = unpack('V', substr($webp, $at + 4, 4))[1];
            $chunks[substr($webp, $at, 4)] = substr($webp, $at + 8, $length);
            $at += 8 + $length + ($length % 2);
        }

        return $chunks;
    }

    /** The precondition: before anything else, prove the input really carries her location. */
    private function assertCarriesGps(string $kind, string $bytes): void
    {
        $this->assertNotFalse(@imagecreatefromstring($bytes), "the $kind input is a real image GD can open");
        if ($kind === 'jpeg') {
            $exif = $this->exifOf($bytes);
            $this->assertSame(['30/1', '2/1', '405/10'], $exif['GPS']['GPSLatitude'] ?? null, 'PHP reads the GPS latitude in the JPEG');
            $this->assertSame('N', $exif['GPS']['GPSLatitudeRef'] ?? null);
            $this->assertSame(['31/1', '14/1', '86/10'], $exif['GPS']['GPSLongitude'] ?? null);
            $this->assertSame(6, $exif['IFD0']['Orientation'] ?? null);
            $this->assertStringContainsString('exif:GPSLatitude="30,2.675N"', $bytes, 'XMP carries it too');
            $this->assertStringContainsString("Photoshop 3.0\x008BIM", $bytes, 'and an IPTC block');

            return;
        }
        if ($kind === 'png') {
            $chunks = $this->pngChunks($bytes);
            $this->assertCount(1, $chunks['eXIf'] ?? [], 'one eXIf chunk');
            $this->assertTrue($this->tiffHasGps($chunks['eXIf'][0]), 'PHP reads Cairo\'s coordinates in the eXIf payload');
            $this->assertStringContainsString('GPS 30.0444,31.2357', $chunks['tEXt'][0] ?? '', 'and a text chunk names the place');

            return;
        }
        $chunks = $this->webpChunks($bytes);
        $this->assertSame(0x08, ord($chunks['VP8X'][0] ?? "\0") & 0x08, 'the VP8X header announces EXIF');
        $this->assertTrue($this->tiffHasGps($chunks['EXIF'] ?? ''), 'PHP reads Cairo\'s coordinates in the EXIF chunk');
    }

    /** Nothing but pixels: no metadata segment, no trace of the place, no EXIF at all. */
    private function assertClean(string $jpeg, string $where): void
    {
        $this->assertSame("\xFF\xD8", substr($jpeg, 0, 2), "$where: a JPEG");
        $this->assertSame('image/jpeg', getimagesizefromstring($jpeg)['mime'] ?? null, "$where: a JPEG");

        // every segment up to the image data: only APP0 (JFIF) is allowed among the APPn
        $markers = [];
        for ($at = 2; $at + 4 <= strlen($jpeg);) {
            $this->assertSame("\xFF", $jpeg[$at], "$where: segment structure");
            $marker = ord($jpeg[$at + 1]);
            $markers[] = sprintf('%02X', $marker);
            if ($marker === 0xDA) {
                break; // start of scan: the pixels follow
            }
            $at += 2 + unpack('n', substr($jpeg, $at + 2, 2))[1];
        }
        $app = array_values(array_filter($markers, fn (string $m) => $m >= 'E0' && $m <= 'EF'));
        $this->assertSame(['E0'], $app, "$where: the only application segment is JFIF (no APP1 EXIF/XMP, no APP13 IPTC)");

        foreach (["Exif\0\0", 'GPS', 'http://ns.adobe.com/xap', 'exif:', 'Photoshop 3.0', '8BIM', 'Cairo', '30.0444'] as $trace) {
            $this->assertStringNotContainsString($trace, $jpeg, "$where: no \"".addcslashes($trace, "\0").'"');
        }

        $exif = $this->exifOf($jpeg);
        $this->assertEmpty(array_intersect(array_keys($exif ?: []), ['GPS', 'EXIF', 'IFD0', 'THUMBNAIL']), "$where: PHP's EXIF reader finds no EXIF");
        $this->assertArrayNotHasKey('GPSLatitude', is_array($exif) ? array_merge(...array_values(array_filter($exif, 'is_array'))) : []);

        [$width, $height] = getimagesizefromstring($jpeg);
        $this->assertLessThanOrEqual(config('princess.photos.max_edge'), max($width, $height), "$where: shrunk to the longest side allowed");
    }

    #[DataProvider('inputs')]
    public function test_no_location_or_other_metadata_reaches_storage_or_the_public(string $kind): void
    {
        $bytes = ImageFixtures::$kind();
        $this->assertCarriesGps($kind, $bytes);

        // through the real endpoint, signed out (she uploads before she has an account)
        $upload = UploadedFile::fake()->createWithContent("photo.$kind", $bytes);
        $id = $this->withHeader('Accept', 'application/json')->post('/api/v1/photos', ['photo' => $upload])->assertCreated()->json('id');

        $stored = $this->storedPhoto($id, Photo::PRIVATE);
        $this->assertNotNull($stored, 'stored on the private disk');
        $this->assertNull($this->storedPhoto($id, Photo::PUBLIC), 'and nowhere public');
        $this->assertClean($stored, 'stored');

        // published: the public copy is the same clean file
        config(['princess.moderation.launch_phase' => false]);
        $user = $this->makeUser();
        $this->makeListing(['user_id' => $user->id, 'status' => ListingStatus::Published, 'reviewed_at' => Carbon::now()->subDay(), 'created_at' => Carbon::now()->subDays(2)]);
        $this->signIn($user)->postJson('/api/v1/listings', [...ListingCasesTest::caseFile()['base'], 'photo' => $id])->assertCreated()->assertJsonPath('status', 'published');
        $served = $this->get("/photos/{$id}.jpg")->assertOk()->streamedContent();
        $this->assertSame($stored, $served, 'the public copy is the stored file');
        $this->assertSame($stored, $this->storedPhoto($id, Photo::PUBLIC));
        $this->assertNull($this->storedPhoto($id, Photo::PRIVATE));
        $this->assertClean($served, 'served');
    }

    /** @return array<string, array{int, array{string, string, string, string}}> orientation => colours at TL, TR, BL, BR as she should see them */
    public static function orientations(): array
    {
        return [
            '1 as stored' => [1, ['red', 'green', 'blue', 'blue']],
            '2 mirrored' => [2, ['green', 'red', 'blue', 'blue']],
            '3 half a turn' => [3, ['blue', 'blue', 'green', 'red']],
            '4 upside down' => [4, ['blue', 'blue', 'red', 'green']],
            '5 across the diagonal' => [5, ['red', 'blue', 'green', 'blue']],
            '6 a quarter clockwise' => [6, ['blue', 'red', 'blue', 'green']],
            '7 across the other diagonal' => [7, ['blue', 'green', 'blue', 'red']],
            '8 a quarter anticlockwise' => [8, ['green', 'blue', 'red', 'blue']],
        ];
    }

    /** @param array{string, string, string, string} $corners */
    #[DataProvider('orientations')]
    public function test_a_photo_is_stored_upright_whatever_its_orientation_tag(int $orientation, array $corners): void
    {
        $upload = UploadedFile::fake()->createWithContent('photo.jpg', ImageFixtures::jpeg(400, 300, $orientation));
        $id = $this->withHeader('Accept', 'application/json')->post('/api/v1/photos', ['photo' => $upload])->assertCreated()->json('id');

        $image = imagecreatefromstring($this->storedPhoto($id, Photo::PRIVATE));
        [$w, $h] = [imagesx($image), imagesy($image)];
        $this->assertSame($orientation >= 5 ? [300, 400] : [400, 300], [$w, $h], 'turned a quarter, the sides swap');
        $colour = function (int $x, int $y) use ($image) {
            $rgb = imagecolorat($image, $x, $y);
            $channels = ['red' => ($rgb >> 16) & 0xFF, 'green' => ($rgb >> 8) & 0xFF, 'blue' => $rgb & 0xFF];
            arsort($channels);

            return array_key_first($channels);
        };
        $this->assertSame($corners, [$colour(3, 3), $colour($w - 4, 3), $colour(3, $h - 4), $colour($w - 4, $h - 4)]);
    }
}

