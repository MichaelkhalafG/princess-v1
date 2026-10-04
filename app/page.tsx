import { Board } from '@/components/board/Board.tsx';
import { readBoardContext, shownOf } from '@/lib/board-url.ts';
import { COUNTRIES } from '@/lib/constants.ts';
import { countListings, fetchCategoryCounts, fetchListings, photoUrl } from '@/lib/listings.ts';
import { getSupabase } from '@/lib/supabase.ts';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * The board: /?country=EG&category=nails&q=…&n=48 — every part optional. It loads the
 * newest `n` listings (PAGE_SIZE unless she has asked for more) and how many there are in
 * all, so "عرض المزيد" knows whether there is more.
 */
export default async function BoardPage({ searchParams }: Props) {
  const ctx = readBoardContext(await searchParams);
  const country = ctx.country ?? COUNTRIES[0].code;
  const filters = { country, category: ctx.category, q: ctx.q };
  const shown = shownOf(ctx);

  const db = getSupabase();
  const [listings, total, counts] = await Promise.all([
    fetchListings(db, { ...filters, limit: shown }),
    countListings(db, filters),
    fetchCategoryCounts(db, country),
  ]);

  return (
    <Board
      country={country}
      category={ctx.category}
      q={ctx.q}
      shown={shown}
      total={total}
      counts={counts}
      now={new Date().toISOString()}
      listings={listings.map((l) => ({ listing: l, photoSrc: l.photo ? photoUrl(db, l.photo) : null }))}
    />
  );
}
