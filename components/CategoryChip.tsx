import type { CategorySlug } from '@/lib/constants.ts';
import { getCategory } from '@/lib/constants.ts';
import { toArabicDigits } from '@/lib/format.ts';
import { CategoryIcon } from './CategoryIcon.tsx';
import styles from './CategoryChip.module.css';

/**
 * A category chip. Every place a category appears uses the same anatomy — its line icon,
 * in the category's tone colour, beside its label — so a category looks like itself in
 * the hero, the category bar, the form, the card badge and the footer.
 *   raised — the hero chips: white pill with a soft shadow
 *   bar    — inside the category bar: transparent until selected
 *   inset  — the form's category choice: page-colour pill on the white form card
 *
 * The count sits in its own small pill so it reads as a number belonging to the chip
 * (the design's 11px faint digit read as a stray speck).
 * As a filter it toggles (aria-pressed); in the form it is one radio of a radiogroup.
 */
export function CategoryChip({
  category,
  label,
  icon,
  count,
  selected,
  variant,
  role = 'toggle',
  onSelect,
}: {
  /** null for "all categories" (no tone) */
  category: CategorySlug | null;
  label: string;
  icon: string;
  count?: number;
  selected: boolean;
  variant: 'raised' | 'bar' | 'inset';
  role?: 'toggle' | 'radio';
  onSelect: () => void;
}) {
  const a11y = role === 'radio' ? { role: 'radio', 'aria-checked': selected } : { 'aria-pressed': selected };
  const tone = category ? getCategory(category).tone : null;
  return (
    <button
      type="button"
      {...a11y}
      onClick={onSelect}
      data-tone={tone ?? undefined}
      className={[styles.chip, styles[variant], selected && styles.selected].filter(Boolean).join(' ')}
    >
      <span className={styles.icon}><CategoryIcon path={icon} /></span>
      <span>{label}</span>
      {count !== undefined && <span className={styles.count}>{toArabicDigits(count)}</span>}
    </button>
  );
}
