<?php

namespace Tests\Feature;

use App\Models\Photo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Testing\TestResponse;
use Tests\Support\ImageFixtures;
use Tests\TestCase;

// What the upload endpoint takes and refuses. What a file is, is decided by decoding it.
class PhotoUploadTest extends TestCase
{
    use RefreshDatabase;

    private function upload(string $bytes, string $name = 'photo.jpg', ?string $mime = null): TestResponse
    {
        $file = UploadedFile::fake()->createWithContent($name, $bytes);
        if ($mime !== null) {
            $file->mimeType($mime);
        }

        return $this->withHeader('Accept', 'application/json')->post('/api/v1/photos', ['photo' => $file]);
    }

    private function gd(string $format, int $width = 600, int $height = 400): string
    {
        ob_start();
        match ($format) {
            'jpeg' => imagejpeg(ImageFixtures::picture($width, $height)),
            'png' => imagepng(ImageFixtures::picture($width, $height)),
            'webp' => imagewebp(ImageFixtures::picture($width, $height)),
            'gif' => imagegif(ImageFixtures::picture($width, $height)),
        };

        return ob_get_clean();
    }

    public function test_jpeg_png_and_webp_are_taken_and_stored_as_jpeg_no_larger_than_the_limit(): void
    {
        $max = config('princess.photos.max_edge');
        foreach (['jpeg', 'png', 'webp'] as $format) {
            $res = $this->upload($this->gd($format, 2000, 1000), "photo.$format")->assertCreated();
            $this->assertSame([$max, intdiv($max, 2)], [$res->json('width'), $res->json('height')], $format);
            $stored = $this->storedPhoto($res->json('id'), Photo::PRIVATE);
            $this->assertSame('image/jpeg', getimagesizefromstring($stored)['mime'], $format);
        }
        // a small photo is not enlarged
        $this->upload($this->gd('jpeg', 300, 200))->assertCreated()->assertJsonPath('width', 300)->assertJsonPath('height', 200);
    }

    public function test_the_file_decides_not_its_name_or_the_type_the_client_claims(): void
    {
        $this->upload($this->gd('png'), 'photo.jpg', 'image/jpeg')->assertCreated();
        $this->upload('just some text, not a picture', 'photo.jpg', 'image/jpeg')->assertStatus(422)->assertExactJson(['errors' => ['photo' => 'invalid']]);
        $this->upload($this->gd('gif'), 'photo.jpg', 'image/jpeg')->assertStatus(422)->assertExactJson(['errors' => ['photo' => 'invalid']]);
    }

    public function test_a_file_over_the_size_limit_is_refused_before_it_is_opened(): void
    {
        $max = config('princess.photos.max_bytes');
        $this->upload(str_repeat('a', $max + 1))->assertStatus(422)->assertExactJson(['errors' => ['photo' => 'too_large']]);
        $this->assertSame(0, Photo::count());
    }

    public function test_a_picture_too_large_to_decode_is_refused_from_its_header(): void
    {
        // 30000 × 30000 would need about 4.5 GB to decode; the request has 128 MB
        $this->upload(ImageFixtures::hugePngHeader(), 'photo.png')->assertStatus(422)->assertExactJson(['errors' => ['photo' => 'too_many_pixels']]);
        $this->assertSame(0, Photo::count());
    }

    public function test_no_file_is_required(): void
    {
        $this->withHeader('Accept', 'application/json')->post('/api/v1/photos', [])->assertStatus(422)->assertExactJson(['errors' => ['photo' => 'required']]);
    }

    public function test_transparency_lands_on_white(): void
    {
        $image = imagecreatetruecolor(100, 100);
        imagesavealpha($image, true);
        imagefill($image, 0, 0, imagecolorallocatealpha($image, 0, 0, 0, 127));
        ob_start();
        imagepng($image);
        $id = $this->upload(ob_get_clean(), 'photo.png')->assertCreated()->json('id');

        $stored = imagecreatefromstring($this->storedPhoto($id, Photo::PRIVATE));
        $rgb = imagecolorat($stored, 50, 50);
        $this->assertGreaterThan(245, min(($rgb >> 16) & 0xFF, ($rgb >> 8) & 0xFF, $rgb & 0xFF), 'white, not black');
    }

    public function test_an_upload_is_hers_when_she_is_signed_in_and_nobody_s_when_not(): void
    {
        $user = $this->makeUser();
        $anonymous = $this->upload($this->gd('jpeg'))->assertCreated()->json('id');
        $this->signIn($user);
        $hers = $this->upload($this->gd('jpeg'))->assertCreated()->json('id');

        $this->assertNull(Photo::query()->find($anonymous)->user_id);
        $this->assertSame($user->id, Photo::query()->find($hers)->user_id);
    }

    public function test_one_address_uploads_a_limited_number_of_photos_an_hour(): void
    {
        config(['princess.rate_limits.photo_uploads_per_ip_per_hour' => 2]);
        $this->upload($this->gd('jpeg'))->assertCreated();
        $this->upload($this->gd('jpeg'))->assertCreated();
        $this->upload($this->gd('jpeg'))->assertStatus(429)->assertJsonPath('error', 'too_many_attempts');
    }
}
