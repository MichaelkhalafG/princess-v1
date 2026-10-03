'use client';

import { useEffect, useState, type RefObject } from 'react';
import { Button } from './Button.tsx';
import styles from './FilterBar.module.css';

/**
 * The sticky filter bar: a fixed strip that appears once the category bar has scrolled
 * out of view and shows where she is — country, category, result count. Tapping the
 * country or the category jumps back up to that control.
 */
export function FilterBar({
  visible,
  countryName,
  categoryLabel,
  countLabel,
  onCountryClick,
  onCategoryClick,
}: {
  visible: boolean;
  countryName: string;
  categoryLabel: string;
  countLabel: string;
  onCountryClick: () => void;
  onCategoryClick: () => void;
}) {
  if (!visible) return null;
  return (
    <div role="region" aria-label="الفلتر الحالي" className={styles.bar}>
      <div className={styles.inner}>
        <Button variant="text" className={styles.country} onClick={onCountryClick}>
          <span className={styles.dot} aria-hidden="true" />
          {countryName}
        </Button>
        <span className={styles.divider} aria-hidden="true" />
        <Button variant="text" className={styles.category} onClick={onCategoryClick}>
          {categoryLabel}
        </Button>
        <span className={styles.count}>{countLabel}</span>
      </div>
    </div>
  );
}

/** Pixels of the grid that must still be on screen for the bar to stay (from the design). */
const GRID_VISIBLE_THRESHOLD = 120;

/**
 * The design's rule: show the bar when the category bar's bottom edge is above the
 * viewport and the grid is still on screen.
 */
export function useFilterBarVisible(
  categoryBar: RefObject<HTMLElement | null>,
  grid: RefObject<HTMLElement | null>,
): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => {
      const cb = categoryBar.current;
      const g = grid.current;
      if (!cb || !g) return;
      setVisible(cb.getBoundingClientRect().bottom < 0 && g.getBoundingClientRect().bottom > GRID_VISIBLE_THRESHOLD);
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [categoryBar, grid]);
  return visible;
}
