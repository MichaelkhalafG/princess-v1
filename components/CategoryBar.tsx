'use client';

import { useEffect, useRef, type Ref } from 'react';
import { ALL_CATEGORIES, CATEGORIES, type CategorySlug } from '@/lib/constants.ts';
import { CategoryChip } from './CategoryChip.tsx';
import styles from './CategoryBar.module.css';

/**
 * The full category bar: "all" plus every category, in one horizontally scrolling white
 * pill. Not sticky — the sticky filter bar is a separate component (FilterBar).
 * Services and clothes-for-sale share this one bar.
 *
 * Where the row scrolls (phones, tablets), the selected chip is brought into view: on
 * load — a category deep in the list would otherwise be off-screen — and whenever the
 * selection changes. Only the row moves, never the page.
 */
export function CategoryBar({
  selected,
  onSelect,
  ref,
}: {
  selected: CategorySlug | null;
  onSelect: (category: CategorySlug | null) => void;
  ref?: Ref<HTMLDivElement>;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);

  useEffect(() => {
    const row = scroller.current;
    const instant = firstRun.current || matchMedia('(prefers-reduced-motion: reduce)').matches;
    firstRun.current = false;
    if (!row || row.scrollWidth <= row.clientWidth) return; // wrapped: everything is in view
    const chip = row.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!chip) return;
    const r = row.getBoundingClientRect();
    const c = chip.getBoundingClientRect();
    const fade = parseFloat(getComputedStyle(row).paddingInlineEnd) || 0; // the trailing (left) fade
    if (c.left >= r.left + fade && c.right <= r.right) return; // already fully visible
    row.scrollBy({ left: c.left + c.width / 2 - (r.left + r.width / 2), behavior: instant ? 'instant' : 'smooth' });
  }, [selected]);

  return (
    <div className={styles.wrap} ref={ref}>
      <div className={styles.inner}>
        <div className={styles.scroll} ref={scroller}>
          <CategoryChip
            category={null}
            variant="bar"
            label={ALL_CATEGORIES.label}
            icon={ALL_CATEGORIES.icon}
            selected={selected === null}
            onSelect={() => onSelect(null)}
          />
          {CATEGORIES.map((c) => (
            <CategoryChip
              key={c.slug}
              category={c.slug}
              variant="bar"
              label={c.label}
              icon={c.icon}
              selected={selected === c.slug}
              onSelect={() => onSelect(c.slug)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
