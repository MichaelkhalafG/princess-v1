// Reads for the board and the listing page, from the API (apps/api). The API filters, searches
// (folding Arabic spelling) and orders; it returns published listings only, so anything else is
// simply not there.
//
// The filter set is country + category + search. Nothing else: no city or district
// filter, and price is free text, so it is never filtered or sorted.

import type { CategorySlug, CountryCode } from '@princess/shared/constants.ts';
import type { Listing } from '@princess/shared/listing.ts';
import { apiUrl } from './api.ts';

export type ListingFilters = {
  country: CountryCode;
  category?: CategorySlug | null;
  /** Free text, matched against name, title, description, city and district. */
  q?: string | null;
  /** At most this many, newest first (the board loads PAGE_SIZE at a time). */
  limit?: number;
};

/** GET from the API: the JSON, or null for "not found". Anything else unexpected throws, and
    the page shows its error state (app/error.tsx). */
async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(apiUrl(path), { cache: 'no-store', headers: { Accept: 'application/json' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status} for ${path}`);
  return (await res.json()) as T;
}

function boardQuery(f: ListingFilters): string {
  const p = new URLSearchParams({ country: f.country });
  if (f.category) p.set('category', f.category);
  const q = f.q?.trim();
  if (q) p.set('q', q);
  if (f.limit) p.set('limit', String(f.limit));
  return p.toString();
}

/** The newest `limit` listings that match, and how many match in all. "عرض المزيد" asks for
    the first n again, so the order stays stable and a URL with n=48 always shows the same 48. */
export async function fetchBoard(f: ListingFilters): Promise<{ items: Listing[]; total: number }> {
  const board = await get<{ items: Listing[]; total: number }>(`/listings?${boardQuery(f)}`);
  if (!board) throw new Error('API: the board was not found');
  return board;
}

/** How many listings match the filters in all. */
export async function countListings(f: ListingFilters): Promise<number> {
  return (await fetchBoard({ ...f, limit: 1 })).total;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One published listing by id, or null when there is none (including a malformed id). */
export async function fetchListing(id: string): Promise<Listing | null> {
  if (!UUID.test(id)) return null;
  return get<Listing>(`/listings/${id}`);
}

/** Other published listings in the same country and category, newest first (the API caps them). */
export async function fetchOthers(l: Pick<Listing, 'id'>): Promise<Listing[]> {
  return (await get<{ items: Listing[] }>(`/listings/${l.id}/others`))?.items ?? [];
}

