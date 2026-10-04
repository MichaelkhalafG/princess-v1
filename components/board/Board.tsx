'use client';

import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ALL_CATEGORIES, getCategory, getCountry, type CategorySlug, type CountryCode } from '@/lib/constants.ts';
import { boardHref, boardQuery, withBoardContext } from '@/lib/board-url.ts';
import { listingCountLabel, searchPlaceholder } from '@/lib/format.ts';
import type { Listing } from '@/lib/listing.ts';
import { Button } from '../Button.tsx';
import { CategoryBar } from '../CategoryBar.tsx';
import { CategoryChip } from '../CategoryChip.tsx';
import { CountrySelector } from '../CountrySelector.tsx';
import { EmptyState } from '../EmptyState.tsx';
import { FilterSummary, useFilterBarVisible } from '../FilterBar.tsx';
import { ListingCard } from '../ListingCard.tsx';
import { SearchField } from '../SearchField.tsx';
import { SiteFooter } from '../SiteFooter.tsx';
import { SiteHeader } from '../SiteHeader.tsx';
import { HeroCollage } from './HeroCollage.tsx';
import styles from './Board.module.css';

/** The six categories the hero offers as shortcuts, in the design's order. */
const HERO_CATEGORIES: CategorySlug[] = ['nails', 'tailoring', 'cooking-and-desserts', 'makeup', 'henna', 'private-tutoring'];

const SEARCH_DEBOUNCE_MS = 350;

/** What the result count says while new results are on their way. */
const LOADING_LABEL = 'جارٍ التحديث…';

export type BoardListing = { listing: Listing; photoSrc: string | null };

/**
 * The board. Country, category and search live in the URL (/?country=EG&category=nails&q=…):
 * the server filters, this component only changes the URL.
 */
export function Board({
  country,
  category,
  q,
  listings,
  counts,
  now,
}: {
  country: CountryCode;
  category: CategorySlug | null;
  q: string;
  listings: BoardListing[];
  counts: Partial<Record<CategorySlug, number>>;
  /** ISO time the server rendered at, so server and browser agree on "قبل ٣ ساعات". */
  now: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(q);
  // Results fade in only when the result set changes — never on first load, and never
  // replaying the old results while the new ones are still loading.
  const resultKey = `${country}|${category ?? ''}|${q}`;
  const firstResultKey = useRef(resultKey);
  const resultsChanged = useRef(false);
  if (resultKey !== firstResultKey.current) resultsChanged.current = true;
  const heroControls = useRef<HTMLDivElement>(null);
  const categoryBar = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLElement>(null);
  const summaryVisible = useFilterBarVisible(categoryBar, grid);

  const k = getCountry(country);
  const nowDate = new Date(now);
  const n = listings.length;
  const countLabel = listingCountLabel(n);
  const activeLabel = category ? getCategory(category).label : ALL_CATEGORIES.label;

  // Where she is now — carried by every link that leaves the board, so coming back
  // (by the logo, a back link, or the form) returns her here.
  const ctx = { country, category, q };
  const listingQuery = boardQuery(ctx);

  // The controls answer the click at once; the URL (and the results) follow from the
  // server a moment later. Without this the chip only changed colour when the new results
  // arrived — 0.3–0.8s after the click — and its transition was lost in the swap.
  const [selected, setSelected] = useOptimistic({ country, category });

  /** Brings the results to the top of the screen, under the sticky header. */
  const revealResults = () => {
    const el = grid.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const header = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
    const top = el.getBoundingClientRect().top;
    // already at the top of the screen (within a few px): nothing to do
    if (Math.abs(top - header) < 8) return;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  const navigate = (next: { country?: CountryCode; category?: CategorySlug | null; q?: string }, reveal = true) => {
    const nextCountry = next.country ?? selected.country;
    const nextCategory = next.category === undefined ? selected.category : next.category;
    const p = new URLSearchParams();
    p.set('country', nextCountry);
    if (nextCategory) p.set('category', nextCategory);
    const text = (next.q ?? query).trim();
    if (text) p.set('q', text);
    startTransition(() => {
      setSelected({ country: nextCountry, category: nextCategory });
      router.replace(`/?${p.toString()}`, { scroll: false });
    });
    // After a filter change the results are usually below the fold: bring them into view
    // so the dim-and-fade answering her click is where she is looking.
    if (reveal) revealResults();
  };

  // Search as she types, once she pauses — without moving the page under her typing.
  useEffect(() => {
    if (query.trim() === q) return;
    const t = setTimeout(() => navigate({ q: query }, false), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const jumpTo = (el: HTMLElement | null, focusSelector: string) => {
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const header = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - header - 16, behavior: reduced ? 'auto' : 'smooth' });
    const target = el.querySelector<HTMLElement>(focusSelector);
    if (target) setTimeout(() => target.focus({ preventScroll: true }), reduced ? 0 : 450);
  };

  const postHref = withBoardContext('/new', ctx);

  /** "Clear the search": back to the same country and category, with no search. */
  const clearSearch = () => {
    setQuery('');
    navigate({ q: '' });
  };
  const currentCategory = selected.category ? getCategory(selected.category) : null;

  return (
    <div className={styles.page}>
      <SiteHeader
        homeHref={boardHref(ctx)}
        skip={{ href: '#listings', label: 'انتقلي إلى الإعلانات' }}
        postHref={postHref}
        center={summaryVisible ? (
          <FilterSummary
            countryName={getCountry(selected.country).name}
            countryFlag={getCountry(selected.country).flag}
            categoryLabel={currentCategory ? currentCategory.label : ALL_CATEGORIES.label}
            categoryIcon={currentCategory ? currentCategory.icon : ALL_CATEGORIES.icon}
            countLabel={pending ? LOADING_LABEL : countLabel}
            onCountryClick={() => jumpTo(heroControls.current, '[role="radio"][aria-checked="true"]')}
            onCategoryClick={() => jumpTo(categoryBar.current, 'button')}
          />
        ) : null}
      />

      {/* Full-width band under the header, holding the hero. It tucks up behind the
          (transparent) header so the orbs bleed off the top of the screen; they are
          clipped by the screen edges, never by a section boundary. */}
      <main id="main">
      <div className={styles.top}>
        <span className={`${styles.blob} ${styles.blobTint}`} aria-hidden="true" />
        <span className={`${styles.blob} ${styles.blobAmber}`} aria-hidden="true" />

        <section className={styles.hero}>
          <div className={styles.copy}>
            <h1 className={styles.title}>عملكِ يصل<br />إلى كل سيدة حولك</h1>
            <p className={styles.lead}>اعرضي خدمتك أو ملابسك، وتتواصل معك من تحتاجها عبر واتساب مباشرة. بلا وسيط وبلا عمولة.</p>

            <div className={styles.controls} ref={heroControls}>
              <CountrySelector size="large" value={selected.country} onChange={(c) => navigate({ country: c })} />
              <SearchField
                value={query}
                placeholder={searchPlaceholder(country)}
                onChange={setQuery}
                onSubmit={() => navigate({ q: query })}
              />
            </div>

            <div className={styles.chips}>
              {HERO_CATEGORIES.map((slug) => {
                const c = getCategory(slug);
                return (
                  <CategoryChip
                    key={slug}
                    variant="raised"
                    category={slug}
                    label={c.label}
                    icon={c.icon}
                    count={counts[slug] ?? 0}
                    selected={selected.category === slug}
                    onSelect={() => navigate({ category: slug })}
                  />
                );
              })}
            </div>

            <div className={styles.ctaRow}>
              <Button variant="cta" href={postHref}>اعرضي خدمتك</Button>
              <span className={styles.ctaNote}>مجاني، بلا حساب أو تسجيل</span>
            </div>
          </div>

          <HeroCollage />
        </section>
      </div>

      <CategoryBar ref={categoryBar} selected={selected.category} counts={counts} onSelect={(c) => navigate({ category: c })} />

      {/* tabIndex -1: the skip link's target takes focus, so the next Tab is the first card */}
      <section id="listings" tabIndex={-1} className={styles.grid} ref={grid} aria-busy={pending} aria-labelledby="listings-title">
        <div className={styles.gridHead}>
          <h2 id="listings-title" className={styles.gridTitle}>
            {q
              ? `نتائج «${q}»${category ? ` في «${activeLabel}»` : ''} في ${k.name}`
              : category ? `${activeLabel} في ${k.name}` : `آخر الإعلانات في ${k.name}`}
          </h2>
          <span className={styles.count}>{pending ? LOADING_LABEL : countLabel}</span>
          {pending && <span className={styles.loading} aria-hidden="true" />}
        </div>

        {n === 0 ? (
          q ? (
            // A search that found nothing: say what she searched for, and the two ways out —
            // drop the search, or (inside a category) go back to the whole country.
            <EmptyState
              title={`لا نتائج لـ«${q}»${category ? ` في «${activeLabel}»` : ''} في ${k.name}`}
              body="جرّبي كلمة أخرى أو أقصر، أو امسحي البحث لتري كل الإعلانات."
              actions={[
                { label: 'امسحي البحث', onClick: clearSearch },
                category ? { label: `كل إعلانات ${k.name}`, onClick: () => { setQuery(''); navigate({ category: null, q: '' }); } } : undefined,
              ]}
            />
          ) : (
            // Nothing posted here yet: invite her to be first, or let her see the rest.
            <EmptyState
              title={category ? `لا توجد إعلانات في «${activeLabel}» في ${k.name} بعد` : `لا توجد إعلانات في ${k.name} بعد`}
              body="كوني أول من تعرض هنا، فالإعلان يستغرق دقيقتين."
              actions={[
                { label: 'اعرضي خدمتك الآن', href: postHref },
                category ? { label: 'تصفحي كل الفئات', onClick: () => navigate({ category: null }) } : undefined,
              ]}
            />
          )
        ) : (
          <div
            // a new element per result set, so the fade-in plays once per new set
            key={resultKey}
            className={`${styles.cards} ${resultsChanged.current ? styles.cardsIn : ''} ${pending ? styles.cardsPending : ''}`}
          >
            {listings.map(({ listing, photoSrc }) => (
              <ListingCard key={listing.id} listing={listing} photoSrc={photoSrc} now={nowDate} contextQuery={listingQuery} />
            ))}
          </div>
        )}
      </section>
      </main>

      <SiteFooter ctx={ctx} />
    </div>
  );
}
