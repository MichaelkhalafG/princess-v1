<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ListListingsRequest;
use App\Models\Listing;
use App\Support\ArabicFold;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;

/**
 * The board's reads. Only published listings exist here: anything else is "not found", the
 * same answer as an id that was never used, so a listing's state never leaks.
 */
class ListingController extends Controller
{
    /** The board: the newest `limit` listings matching the filters, and how many match in all. */
    public function index(ListListingsRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $query = Listing::query()->published()->where('country', $filters['country']);
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
        $items = Listing::query()->published()
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
        return Listing::query()->published()->whereKey($id)->firstOrFail();
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
