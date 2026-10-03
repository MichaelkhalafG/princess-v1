import { Board } from '@/components/board/Board.tsx';
import { COUNTRIES, isCategorySlug, isCountryCode } from '@/lib/constants.ts';
import { fetchCategoryCounts, fetchListings, photoUrl } from '@/lib/listings.ts';
import { getSupabase } from '@/lib/supabase.ts';

export const dynamic = 'force-dynamic';

/** Long enough for any real search; stops a pasted essay becoming a query. */
const MAX_QUERY = 100;

type Props = { searchParams: Promise<{ country?: string; category?: string; q?: string }> };

/** The board: /?country=EG&category=nails&q=… — every part optional. */
export default async function BoardPage({ searchParams }: Props) {
  const sp = await searchParams;
  const country = isCountryCode(sp.country) ? sp.country : COUNTRIES[0].code;
  const category = isCategorySlug(sp.category) ? sp.category : null;
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, MAX_QUERY) : '';

  const db = getSupabase();
  const [listings, counts] = await Promise.all([
    fetchListings(db, { country, category, q }),
    fetchCategoryCounts(db, country),
  ]);

  return (
    <Board
      country={country}
      category={category}
      q={q}
      counts={counts}
      now={new Date().toISOString()}
      listings={listings.map((l) => ({ listing: l, photoSrc: l.photo ? photoUrl(db, l.photo) : null }))}
    />
  );
}
