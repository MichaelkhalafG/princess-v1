import { Board } from '@/components/board/Board.tsx';
import { readBoardContext, shownOf } from '@/lib/board-url.ts';
import { COUNTRIES } from '@/lib/constants.ts';
import { countListings, fetchListings, photoUrl } from '@/lib/listings.ts';
import { getSupabase } from '@/lib/supabase.ts';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * The board: /?country=EG&category=nails&q=…&n=48 — every part optional. It loads the
 * newest `n` listings (PAGE_SIZE unless she has asked for more) and how many there are in
 * all, so "عرض المزيد" knows whether there is more.
 *
 * A country with no listing at all — not just none matching a filter — gets the launch
 * state (Board `launch`): there is nothing yet to search or filter. The next request
 * after its first listing is posted renders the ordinary board (the page is never cached).
 */
export default async function BoardPage({ searchParams }: Props) {
  const ctx = readBoardContext(await searchParams);
  const country = ctx.country ?? COUNTRIES[0].code;
  const filters = { country, category: ctx.category, q: ctx.q };
  const shown = shownOf(ctx);

  const db = getSupabase();
  const narrowed = Boolean(ctx.category || ctx.q);
  const [listings, total, countryTotal] = await Promise.all([
    fetchListings(db, { ...filters, limit: shown }),
    countListings(db, filters),
    narrowed ? countListings(db, { country }) : null,
  ]);
  const launch = (countryTotal ?? total) === 0;
  // In the launch state, the countries that do have listings, to offer instead.
  const elsewhere = launch
    ? (await Promise.all(COUNTRIES.filter((c) => c.code !== country).map(async (c) => ((await countListings(db, { country: c.code })) > 0 ? c.code : null))))
        .filter((c) => c !== null)
    : [];

  return (
    <Board
      country={country}
      category={ctx.category}
      q={ctx.q}
      shown={shown}
      total={total}
      launch={launch}
      elsewhere={elsewhere}
      now={new Date().toISOString()}
      listings={listings.map((l) => ({ listing: l, photoSrc: l.photo ? photoUrl(db, l.photo) : null }))}
    />
  );
}
