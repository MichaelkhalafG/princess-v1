<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Photo;
use App\Photos\PhotoProcessor;
use App\Photos\PhotoRejected;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class PhotoController extends Controller
{
    /**
     * A photo for a listing she is about to send. It needs no account (she signs up at the end
     * of the form). It is stored re-encoded and private; POST /listings claims it by its id
     * within unclaimed_hours, or it is deleted.
     */
    public function store(Request $request): JsonResponse
    {
        $file = $request->file('photo');
        if ($file === null) {
            // a file over PHP's upload_max_filesize arrives as no file at all, or as one in error
            return $this->refuse($request->server('CONTENT_LENGTH') > config('princess.photos.max_bytes') ? 'too_large' : 'required');
        }
        if (! $file->isValid()) {
            return $this->refuse(in_array($file->getError(), [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) ? 'too_large' : 'invalid');
        }
        if ($file->getSize() > config('princess.photos.max_bytes')) {
            return $this->refuse('too_large');
        }

        self::raiseMemoryLimit((string) config('princess.photos.memory_limit'));
        try {
            $processed = PhotoProcessor::process((string) file_get_contents($file->getRealPath()));
        } catch (PhotoRejected $e) {
            return $this->refuse($e->getMessage());
        }

        $photo = DB::transaction(function () use ($request, $processed) {
            $photo = Photo::create([
                'user_id' => $request->user('sanctum')?->getKey(),
                'visibility' => Photo::PRIVATE,
                'width' => $processed['width'],
                'height' => $processed['height'],
                'bytes' => strlen($processed['jpeg']),
            ]);
            Photo::disk(Photo::PRIVATE)->put($photo->fileName(), $processed['jpeg']);

            return $photo;
        });

        return response()->json(['id' => $photo->id, 'width' => $photo->width, 'height' => $photo->height], 201);
    }

    /** A published listing's photo. Any other photo is "not found", like one that never existed. */
    public function showPublic(string $id): Response
    {
        $photo = Photo::query()->whereKey($id)->where('visibility', Photo::PUBLIC)->first();
        abort_if($photo === null, 404);

        return Photo::disk(Photo::PUBLIC)->response($photo->fileName(), null, [
            'Content-Type' => 'image/jpeg',
            // a published photo never changes; a new photo gets a new id
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** A photo that is not public, through a signed address only (her listings page, the admin). */
    public function showPrivate(Request $request, string $id): Response
    {
        abort_unless($request->hasValidSignature(), 404);
        $photo = Photo::query()->find($id);
        abort_if($photo === null, 404);

        return Photo::disk($photo->visibility)->response($photo->fileName(), null, [
            'Content-Type' => 'image/jpeg',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    /** Raises PHP's memory limit for this request to $limit ("192M"); never lowers it. */
    private static function raiseMemoryLimit(string $limit): void
    {
        $bytes = fn (string $v) => $v === '-1' ? PHP_INT_MAX : (int) $v * match (strtoupper(substr($v, -1))) { 'G' => 1 << 30, 'M' => 1 << 20, 'K' => 1 << 10, default => 1 };
        if ($limit !== '' && $bytes($limit) > $bytes((string) ini_get('memory_limit'))) {
            @ini_set('memory_limit', $limit);
        }
    }

    private function refuse(string $code): JsonResponse
    {
        return response()->json(['errors' => ['photo' => $code]], 422);
    }
}
