// Where she was on the board: country, category and search. Carried by every route home
// (logo, back links, the posted banner, not-found) and by every listing link, so coming
// back never throws her filters away.

import { COUNTRIES, isCategorySlug, isCountryCode, type CategorySlug, type CountryCode } from './constants.ts';

export type BoardContext = { country: CountryCode | null; category: CategorySlug | null; q: string };

/** Long enough for any real search; stops a pasted essay becoming a query. */
export const MAX_QUERY = 100;

/** Reads (and validates) a board context from search params. Unknown values are dropped. */
export function readBoardContext(params: { get(name: string): string | null } | Record<string, string | string[] | undefined>): BoardContext {
  const get = (k: string): string | null => {
    if (typeof (params as { get?: unknown }).get === 'function') return (params as { get(name: string): string | null }).get(k);
    const v = (params as Record<string, string | string[] | undefined>)[k];
    return typeof v === 'string' ? v : null;
  };
  const country = get('country');
  const category = get('category');
  const q = (get('q') ?? '').trim().slice(0, MAX_QUERY);
  return { country: isCountryCode(country) ? country : null, category: isCategorySlug(category) ? category : null, q };
}

/** "country=SA&category=nails&q=…" — empty parts left out. */
export function boardQuery(ctx: BoardContext): string {
  const p = new URLSearchParams();
  if (ctx.country) p.set('country', ctx.country);
  if (ctx.category) p.set('category', ctx.category);
  if (ctx.q) p.set('q', ctx.q);
  return p.toString();
}

/** The board, exactly where she left it. `fallbackCountry` fills a missing country. */
export function boardHref(ctx: BoardContext, fallbackCountry?: CountryCode): string {
  const query = boardQuery({ ...ctx, country: ctx.country ?? fallbackCountry ?? null });
  return query ? `/?${query}` : `/?country=${COUNTRIES[0].code}`;
}

/** A path that keeps the board context in its query string (listing pages, the form). */
export function withBoardContext(path: string, ctx: BoardContext, extra?: Record<string, string>): string {
  const p = new URLSearchParams(boardQuery(ctx));
  for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v);
  const query = p.toString();
  return query ? `${path}?${query}` : path;
}
