<?php

namespace App\Models;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

/**
 * A listing photo: a JPEG the server wrote (App\Photos\PhotoProcessor), on the private disk
 * until its listing is published and on the public disk while it is.
 *
 * @property string $id
 * @property string $visibility "private" or "public"
 */
class Photo extends Model
{
    use HasUuids;

    public const PRIVATE = 'private';

    public const PUBLIC = 'public';

    protected $guarded = ['id'];

    /** Random (version 4) ids, like listings: an address reveals nothing. */
    public function newUniqueId(): string
    {
        return (string) Str::uuid();
    }

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }

    public function fileName(): string
    {
        return $this->id.'.jpg';
    }

    public static function disk(string $visibility): Filesystem
    {
        return Storage::disk($visibility === self::PUBLIC ? 'photos_public' : 'photos_private');
    }

    /** Moves the file to the disk for $visibility (public exactly while the listing is published). */
    public function moveTo(string $visibility): void
    {
        if ($this->visibility === $visibility) {
            return;
        }
        $from = self::disk($this->visibility);
        $to = self::disk($visibility);
        $to->put($this->fileName(), $from->get($this->fileName()));
        $from->delete($this->fileName());
        $this->forceFill(['visibility' => $visibility])->save();
    }

    /** Deletes the file and the row. */
    public function deleteWithFile(): void
    {
        self::disk($this->visibility)->delete($this->fileName());
        $this->delete();
    }

    /**
     * What a client shows: the public address of a published photo, or a signed address, valid
     * for private_link_minutes, for one that is not (only she and the moderators get one).
     *
     * @return array{url: string, width: int, height: int}
     */
    public function toClient(bool $privateAllowed = false): ?array
    {
        if ($this->visibility === self::PUBLIC) {
            $url = config('princess.photos.public_url').'/'.$this->fileName();
        } elseif ($privateAllowed) {
            $url = URL::temporarySignedRoute('photos.private', Carbon::now()->addMinutes(config('princess.photos.private_link_minutes')), ['id' => $this->id]);
        } else {
            return null;
        }

        return ['url' => $url, 'width' => (int) $this->width, 'height' => (int) $this->height];
    }
}
