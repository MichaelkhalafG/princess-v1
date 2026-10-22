// Where she was on the board: country, category, search, and how many listings she had
// loaded. Carried by every route home (logo, back links, the posted banner, not-found)
// and by every listing link, so coming back never throws her place away.

import { COUNTRIES, isCategorySlug, isCountryCode, type CategorySlug, type CountryCode } from './constants.ts';

/**
 * shown: how many listings she has loaded ("عرض المزيد" adds PAGE_SIZE each time). Absent
 * means the first page; it is carried only once she has loaded more.
 */
export type BoardContext = { country: CountryCode | null; category: CategorySlug | null; q: string; shown?: number };

/** Listings per "page": divides into the phone's two columns and the desktop's four. */
export const PAGE_SIZE = 24;
/** The most one URL can ask for at once (twenty pages). */
export const MAX_SHOWN = PAGE_SIZE * 20;

/** "n" from the URL: a whole number of pages beyond the first, within MAX_SHOWN; else none. */
function readShown(raw: string | null): number | undefined {
  if (!raw || !/^\d{1,4}$/.test(raw)) return undefined;
  const n = Number(raw);
  return n > PAGE_SIZE && n <= MAX_SHOWN && n % PAGE_SIZE === 0 ? n : undefined;
}

/** No context: the board's defaults (first country, all categories, no search). */
export const NO_BOARD_CONTEXT: BoardContext = { country: null, category: null, q: '' };

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
  const shown = readShown(get('n'));
  return {
    country: isCountryCode(country) ? country : null,
    category: isCategorySlug(category) ? category : null,
    q,
    ...(shown ? { shown } : {}),
  };
}

/** "country=SA&category=nails&q=…&n=48" — empty parts, and the first page, left out. */
export function boardQuery(ctx: BoardContext): string {
  const p = new URLSearchParams();
  if (ctx.country) p.set('country', ctx.country);
  if (ctx.category) p.set('category', ctx.category);
  if (ctx.q) p.set('q', ctx.q);
  if (ctx.shown && ctx.shown > PAGE_SIZE) p.set('n', String(ctx.shown));
  return p.toString();
}

/** The board, exactly where she left it. `fallbackCountry` fills a missing country. */
export function boardHref(ctx: BoardContext, fallbackCountry?: CountryCode): string {
  const query = boardQuery({ ...ctx, country: ctx.country ?? fallbackCountry ?? null });
  return query ? `/?${query}` : `/?country=${COUNTRIES[0].code}`;
}

/** How many listings the board loads for this context. */
export function shownOf(ctx: BoardContext): number {
  return ctx.shown ?? PAGE_SIZE;
}

/** The board scrolled to one listing's card — how "back" returns her to the card she opened. */
export function boardHrefAt(ctx: BoardContext, listingId: string, fallbackCountry?: CountryCode): string {
  return `${boardHref(ctx, fallbackCountry)}#l-${listingId}`;
}

/** A path that keeps the board context in its query string (listing pages, the form). */
export function withBoardContext(path: string, ctx: BoardContext, extra?: Record<string, string>): string {
  const p = new URLSearchParams(boardQuery(ctx));
  for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v);
  const query = p.toString();
  return query ? `${path}?${query}` : path;
}
