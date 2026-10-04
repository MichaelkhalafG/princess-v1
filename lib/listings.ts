// Reads and writes for the listings board. Every function takes the client as a parameter
// so the database tests can run the exact same code against a local instance.
//
// The filter set is country + category + search. Nothing else: no city or district
// filter, and price is free text, so it is never filtered or sorted.

import type { SupabaseClient } from '@supabase/supabase-js';
import { PHOTO_BUCKET, type CategorySlug, type CountryCode } from './constants.ts';
import { LISTING_COLUMNS, validateListing, type Listing, type ValidationErrors } from './listing.ts';
import { categoriesNamedIn } from './search.ts';

export type ListingFilters = {
  country: CountryCode;
  category?: CategorySlug | null;
  /** Free text, matched against name, title, description, city and district. */
  q?: string | null;
  /** At most this many, newest first (the board loads PAGE_SIZE at a time). */
  limit?: number;
};

/** The three query methods the filters use. The rows query and the count query are
    different builder types (their generics are too deep to unify), but both have these. */
type Filterable = { eq(column: string, value: string): Filterable; ilike(column: string, pattern: string): Filterable; or(filters: string): Filterable };

/** Country, category and search, applied identically to the rows and to their count. */
function applyFilters<Q>(query: Q, f: ListingFilters): Q {
  let out = (query as unknown as Filterable).eq('country', f.country);
  if (f.category) out = out.eq('category', f.category);
  const q = f.q?.trim();
  if (q) {
    // search_text is a generated column: name, title, description, city and district.
    // A search that names a category ("أظافر", "اظافر") also finds that category's
    // listings, whatever words they use (lib/search.ts).
    const pattern = `%${escapeLike(q)}%`;
    const named = categoriesNamedIn(q);
    out = named.length
      ? out.or(`search_text.ilike.${postgrestQuote(pattern)},category.in.(${named.join(',')})`)
      : out.ilike('search_text', pattern);
  }
  return out as unknown as Q;
}

/** A value inside a PostgREST or() filter: double-quoted, with \ and " escaped, so what
    she typed (commas, brackets, quotes) cannot change the filter's structure. */
export function postgrestQuote(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Escapes LIKE wildcards so the search text matches literally. */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// The board loads PAGE_SIZE at a time ("عرض المزيد" asks for the first n again, so the
// order stays stable and a URL with n=48 always shows the same 48); keyset pagination is
// not needed for that. Search stays ILIKE substring on purpose: Arabic words carry prefixes and suffixes
// ("الكوافير" must match "كوافير"), which word-based full-text search would miss.
// Add a pg_trgm index only if it gets slow — and ask first.
export async function fetchListings(db: SupabaseClient, f: ListingFilters): Promise<Listing[]> {
  let query = applyFilters(db.from('listings').select(LISTING_COLUMNS), f).order('created_at', { ascending: false }).order('id');
  if (f.limit) query = query.limit(f.limit);
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Listing[];
}

/** How many listings match the filters in all — the board's count, and whether there is more. */
export async function countListings(db: SupabaseClient, f: ListingFilters): Promise<number> {
  const { count, error } = await applyFilters(db.from('listings').select('id', { count: 'exact', head: true }), f);
  if (error) throw error;
  return count ?? 0;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One listing by id, or null when there is none (including a malformed id). */
export async function fetchListing(db: SupabaseClient, id: string): Promise<Listing | null> {
  if (!UUID.test(id)) return null;
  const { data, error } = await db.from('listings').select(LISTING_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as Listing | null;
}

/** Up to OTHERS_LIMIT other listings in the same country and category, newest first. */
export const OTHERS_LIMIT = 12;

export async function fetchOthers(db: SupabaseClient, l: Pick<Listing, 'id' | 'country' | 'category'>): Promise<Listing[]> {
  const { data, error } = await db
    .from('listings')
    .select(LISTING_COLUMNS)
    .eq('country', l.country)
    .eq('category', l.category)
    .neq('id', l.id)
    .order('created_at', { ascending: false })
    .order('id')
    .limit(OTHERS_LIMIT);
  if (error) throw error;
  return data as unknown as Listing[];
}

/** Number of listings per category in one country. Categories with none are absent. */
export async function fetchCategoryCounts(db: SupabaseClient, country: CountryCode): Promise<Partial<Record<CategorySlug, number>>> {
  const { data, error } = await db.rpc('listing_category_counts', { p_country: country });
  if (error) throw error;
  const out: Partial<Record<CategorySlug, number>> = {};
  for (const row of data as { category: CategorySlug; total: number }[]) out[row.category] = Number(row.total);
  return out;
}

export type InsertResult = { ok: true; listing: Listing } | { ok: false; errors: ValidationErrors } | { ok: false; dbError: string };

/** Validates, then inserts. The database re-checks everything independently. */
export async function insertListing(db: SupabaseClient, input: unknown): Promise<InsertResult> {
  const v = validateListing(input);
  if (!v.ok) return v;
  const { data, error } = await db.from('listings').insert(v.value).select(LISTING_COLUMNS).single();
  if (error) return { ok: false, dbError: error.message };
  return { ok: true, listing: data as unknown as Listing };
}

/** Public URL of a photo stored as an object path in the listing-photos bucket. */
export function photoUrl(db: SupabaseClient, path: string): string {
  return db.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}
