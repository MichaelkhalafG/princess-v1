<?php

namespace App\Http\Controllers\Api;

use App\Accounts\AccountInput;
use App\Accounts\SignIn;
use App\Accounts\UnverifiedAccount;
use App\Http\Controllers\Controller;
use App\Http\Requests\ListListingsRequest;
use App\Listings\ListingInput;
use App\Listings\PublishDecision;
use App\Models\Ban;
use App\Models\Listing;
use App\Models\Photo;
use App\Models\User;
use App\Support\ArabicFold;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * The board's reads, and posting. Only published listings exist for reading: anything else is
 * "not found", the same answer as an id that was never used, so a listing's state never leaks.
 */
class ListingController extends Controller
{
    /**
     * A new listing. Signed in, it is hers. Not signed in, the same request carries "email" and
     * "password" and creates her account with it (she fills the form first and signs up at the
     * end); the account must then verify its email before the listing goes anywhere.
     * Where the listing goes is PublishDecision's: unverified, pending or published.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user('sanctum');
        // a banned account may still sign in, see its listings and delete itself; not post
        if ($user !== null && Ban::accountIsBanned($user)) {
            return response()->json(['error' => 'account_suspended'], 403);
        }
        if ($user !== null && ($wait = $this->postingLimitWait($user)) !== null) {
            return $this->postingLimitReached($wait);
        }

        $listing = ListingInput::validate($request->except(['email', 'password', 'device_name']));
        $errors = $listing['ok'] ? [] : $listing['errors'];
        $photo = $this->claimablePhoto($request->input('photo'), $user);
        if ($photo === false) {
            $errors['photo'] = 'invalid';
        }
        if ($user === null) {
            $errors += AccountInput::newAccountErrors($request->input('email'), $request->input('password'));
        }
        if ($errors !== []) {
            return response()->json(['errors' => $errors], 422);
        }
        // signing up on an email never verified: that account goes first, its listing with it
        if ($user === null) {
            UnverifiedAccount::clearFor($request->input('email'));
        }

        $created = DB::transaction(function () use ($user, $request, $listing, $photo) {
            if ($user !== null) {
                // her row locked, so two posts sent at once cannot both pass the limit
                User::query()->whereKey($user->getKey())->lockForUpdate()->first();
                if (($wait = $this->postingLimitWait($user)) !== null) {
                    return $wait;
                }
            }
            $user ??= User::create([
                'email' => AccountInput::email($request->input('email')),
                'password' => $request->input('password'),
            ]);
            $model = new Listing;
            // the photo is not a column: it is claimed below
            $model->forceFill([...array_diff_key($listing['value'], ['photo' => true]), 'user_id' => $user->getKey()]);
            PublishDecision::apply($model, $user);
            $model->save();
            if ($photo !== null) {
                // locked and checked again: two listings cannot claim one photo
                $claimed = Photo::query()->whereKey($photo->id)->whereNull('listing_id')->lockForUpdate()->first();
                if ($claimed === null) {
                    throw new HttpResponseException(response()->json(['errors' => ['photo' => 'invalid']], 422));
                }
                $claimed->forceFill(['listing_id' => $model->getKey(), 'user_id' => $user->getKey()])->save();
                DB::afterCommit(fn () => $model->syncPhotoVisibility());
            }

            return [$user, $model];
        });
        if (is_int($created)) {
            return $this->postingLimitReached($created);
        }
        [$owner, $model] = $created;

        $body = ['id' => $model->getKey(), 'status' => $model->status->value];
        if ($user === null) {
            $owner->sendEmailVerificationNotification();
            $body += SignIn::start($request, $owner);
        }

        return response()->json($body, 201);
    }

    /**
     * The photo the listing names, if it may have it: an id from POST /photos, claimed by no
     * listing, uploaded within unclaimed_hours, by her or by nobody signed in. Null when the
     * listing names none; false when it names one it may not have.
     */
    private function claimablePhoto(mixed $id, ?User $user): Photo|false|null
    {
        if ($id === null || $id === '') {
            return null;
        }
        if (! is_string($id) || ! Str::isUuid($id)) {
            return false;
        }
        $photo = Photo::query()->whereKey($id)->whereNull('listing_id')
            ->where('created_at', '>', Carbon::now()->subHours(config('princess.photos.unclaimed_hours')))
            ->first();
        if ($photo === null || ($photo->user_id !== null && $photo->user_id !== $user?->getKey())) {
            return false;
        }

        return $photo;
    }

    /** Seconds until she may post again, or null when she is under the daily limit. */
    private function postingLimitWait(User $user): ?int
    {
        $limit = config('princess.posting.per_day');
        $recent = $user->listings()->where('created_at', '>', Carbon::now()->subDay())->orderBy('created_at')->pluck('created_at')->values();
        if ($recent->count() < $limit) {
            return null;
        }
        // a place frees when enough of the day's listings have turned 24 hours old
        $frees = Carbon::parse($recent[$recent->count() - $limit])->addDay();

        return max(1, (int) ceil(Carbon::now()->diffInSeconds($frees, absolute: true)));
    }

    private function postingLimitReached(int $wait): JsonResponse
    {
        return response()->json(['error' => 'posting_limit', 'retry_after' => $wait], 429, ['Retry-After' => $wait]);
    }

    /** The board: the newest `limit` listings matching the filters, and how many match in all. */
    public function index(ListListingsRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $query = Listing::query()->with('photo')->published()->where('country', $filters['country']);
        if (! empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }
        $search = trim($filters['q'] ?? '');
        if ($search !== '') {
            $this->search($query, $search);
        }

        $total = (clone $query)->count();
        $items = $query->boardOrder()->limit($filters['limit'] ?? config('princess.board.page_size'))->get();

        return response()->json([
            'items' => $items->map->toPublic()->all(),
            'total' => $total,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        return response()->json($this->published($id)->toPublic());
    }

    /** Other listings in the same country and category, newest first. */
    public function others(string $id): JsonResponse
    {
        $listing = $this->published($id);
        $items = Listing::query()->with('photo')->published()
            ->where('country', $listing->country)
            ->where('category', $listing->category)
            ->whereKeyNot($listing->getKey())
            ->boardOrder()
            ->limit(config('princess.board.others'))
            ->get();

        return response()->json(['items' => $items->map->toPublic()->all()]);
    }

    private function published(string $id): Listing
    {
        return Listing::query()->with('photo')->published()->whereKey($id)->firstOrFail();
    }

    /**
     * Matches name, title, description, city and district, folded, as a substring: Arabic
     * words carry prefixes and suffixes ("الكوافير" must match "كوافير"), which word-based
     * full-text search would miss. A search that names a category ("أظافر", "اظافر") also
     * finds that category's listings, whatever words they use.
     *
     * @param  Builder<Listing>  $query
     */
    private function search(Builder $query, string $search): void
    {
        // "!" escapes LIKE's wildcards, so what she typed matches literally; it is not a
        // backslash, so the result is the same whatever the server's SQL mode.
        $pattern = '%'.strtr(ArabicFold::fold($search), ['!' => '!!', '%' => '!%', '_' => '!_']).'%';
        $named = ArabicFold::categoriesNamedIn($search);

        $query->where(function (Builder $where) use ($pattern, $named) {
            $where->whereRaw("search_text LIKE ? ESCAPE '!'", [$pattern]);
            if ($named !== []) {
                $where->orWhereIn('category', $named);
            }
        });
    }
}
