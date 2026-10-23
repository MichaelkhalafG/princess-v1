<?php

namespace App\Photos;

use GdImage;

/**
 * Turns whatever she uploaded into a photo the site can show: decoded by GD, turned upright,
 * shrunk to max_edge, written as a new JPEG. Only the pixels cross over. GD writes no
 * metadata, so GPS, camera details, XMP and IPTC in the upload never reach storage.
 *
 * What the file is, is decided by decoding it, never by its name or the type the client sent.
 */
final class PhotoProcessor
{
    private const ACCEPTED = [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP];

    /**
     * @return array{jpeg: string, width: int, height: int}
     *
     * @throws PhotoRejected with code "invalid" or "too_many_pixels"
     */
    public static function process(string $bytes): array
    {
        // the header first: the type, and the size, before any memory is spent on pixels
        $info = @getimagesizefromstring($bytes);
        if ($info === false || ! in_array($info[2], self::ACCEPTED, true)) {
            throw new PhotoRejected('invalid');
        }
        if ($info[0] < 1 || $info[1] < 1) {
            throw new PhotoRejected('invalid');
        }
        if ($info[0] * $info[1] > config('princess.photos.max_pixels')) {
            throw new PhotoRejected('too_many_pixels');
        }

        $source = @imagecreatefromstring($bytes);
        if (! $source instanceof GdImage) {
            throw new PhotoRejected('invalid');
        }
        $source = self::upright($source, $info[2] === IMAGETYPE_JPEG ? self::orientation($bytes) : 1);

        [$width, $height] = self::fit(imagesx($source), imagesy($source), config('princess.photos.max_edge'));
        $photo = imagecreatetruecolor($width, $height);
        // a transparent PNG or WebP lands on white, not black
        imagefill($photo, 0, 0, imagecolorallocate($photo, 255, 255, 255));
        imagecopyresampled($photo, $source, 0, 0, 0, 0, $width, $height, imagesx($source), imagesy($source));
        imageinterlace($photo, true);

        ob_start();
        imagejpeg($photo, null, config('princess.photos.jpeg_quality'));
        $jpeg = ob_get_clean();

        return ['jpeg' => $jpeg, 'width' => $width, 'height' => $height];
    }

    /** The largest size within $max on its longest side, never larger than the original. */
    public static function fit(int $width, int $height, int $max): array
    {
        $scale = min(1, $max / max($width, $height));

        return [max(1, (int) round($width * $scale)), max(1, (int) round($height * $scale))];
    }

    /**
     * The EXIF orientation of a JPEG (1 to 8), or 1 when there is none or PHP's exif extension
     * is not loaded. The web form turns photos upright before uploading; this covers the rest.
     */
    private static function orientation(string $jpeg): int
    {
        if (! function_exists('exif_read_data')) {
            return 1;
        }
        $exif = @exif_read_data('data://image/jpeg;base64,'.base64_encode($jpeg));
        $value = is_array($exif) ? (int) ($exif['Orientation'] ?? 1) : 1;

        return $value >= 1 && $value <= 8 ? $value : 1;
    }

    /** Applies an EXIF orientation to the pixels, so the picture stands as the camera saw it. */
    private static function upright(GdImage $image, int $orientation): GdImage
    {
        // 2 mirrored; 3 half a turn; 4 upside down; 5 mirrored across the diagonal (flip, then a
        // quarter clockwise); 6 a quarter clockwise; 7 the other diagonal; 8 a quarter anticlockwise.
        // imagerotate turns anticlockwise for a positive angle.
        if ($orientation === 2) {
            imageflip($image, IMG_FLIP_HORIZONTAL);
        } elseif (in_array($orientation, [4, 5, 7], true)) {
            imageflip($image, IMG_FLIP_VERTICAL);
        }
        $angle = match ($orientation) {
            3 => 180,
            5, 6 => -90,
            7, 8 => 90,
            default => 0,
        };
        if ($angle !== 0) {
            $turned = imagerotate($image, $angle, 0);
            if ($turned instanceof GdImage) {
                return $turned;
            }
        }

        return $image;
    }
}
