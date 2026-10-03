'use client';

import type { Ref } from 'react';
import { ALL_CATEGORIES, CATEGORIES, type CategorySlug } from '@/lib/constants.ts';
import { CategoryChip } from './CategoryChip.tsx';
import styles from './CategoryBar.module.css';

/**
 * The full category bar: "all" plus every category, in one horizontally scrolling white
 * pill. Not sticky — the sticky filter bar is a separate component (FilterBar).
 * Services and clothes-for-sale share this one bar.
 */
export function CategoryBar({
  selected,
  counts,
  onSelect,
  ref,
}: {
  selected: CategorySlug | null;
  counts: Partial<Record<CategorySlug, number>>;
  onSelect: (category: CategorySlug | null) => void;
  ref?: Ref<HTMLDivElement>;
}) {
  const total = CATEGORIES.reduce((sum, c) => sum + (counts[c.slug] ?? 0), 0);
  return (
    <div className={styles.wrap} ref={ref}>
      <div className={styles.inner}>
        <div className={styles.scroll}>
          <CategoryChip
            variant="bar"
            label={ALL_CATEGORIES.label}
            icon={ALL_CATEGORIES.icon}
            count={total}
            selected={selected === null}
            onSelect={() => onSelect(null)}
          />
          {CATEGORIES.map((c) => (
            <CategoryChip
              key={c.slug}
              variant="bar"
              label={c.label}
              icon={c.icon}
              count={counts[c.slug] ?? 0}
              selected={selected === c.slug}
              onSelect={() => onSelect(c.slug)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
