'use client';

import { useEffect, useState, type RefObject } from 'react';
import { CategoryIcon } from './CategoryIcon.tsx';
import styles from './FilterBar.module.css';

/**
 * Where she is on the board — country, category, result count — shown INSIDE the sticky
 * header once the category bar has scrolled away (it used to be a second fixed bar that
 * stacked under the header). Tapping the country or the category jumps back up to that
 * control.
 */
export function FilterSummary({
  countryName,
  countryFlag,
  categoryLabel,
  categoryIcon,
  countLabel,
  onCountryClick,
  onCategoryClick,
}: {
  countryName: string;
  countryFlag: string;
  categoryLabel: string;
  categoryIcon: string;
  countLabel: string;
  onCountryClick: () => void;
  onCategoryClick: () => void;
}) {
  return (
    <div role="region" aria-label="الفلتر الحالي" className={styles.summary}>
      <button type="button" className={styles.part} onClick={onCountryClick}>
        <span className={styles.dot} aria-hidden="true" />
        {/* small phones show the flag instead of the name; the name stays for screen readers */}
        <img className={styles.flag} src={countryFlag} alt="" aria-hidden="true" />
        <span className={styles.countryName}>{countryName}</span>
      </button>
      <span className={styles.divider} aria-hidden="true" />
      <button type="button" className={`${styles.part} ${styles.category}`} onClick={onCategoryClick}>
        <CategoryIcon path={categoryIcon} />
        <span className={styles.categoryLabel}>{categoryLabel}</span>
      </button>
      <span className={styles.count}>{countLabel}</span>
    </div>
  );
}

/** Pixels of the grid that must still be on screen for the summary to stay (from the design). */
const GRID_VISIBLE_THRESHOLD = 120;

/**
 * The design's rule: show the summary when the category bar's bottom edge has passed the
 * header and the grid is still on screen.
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
      const header = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
      setVisible(cb.getBoundingClientRect().bottom < header && g.getBoundingClientRect().bottom > GRID_VISIBLE_THRESHOLD);
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
