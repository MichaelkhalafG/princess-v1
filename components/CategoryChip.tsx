import type { CategorySlug } from '@/lib/constants.ts';
import { getCategory } from '@/lib/constants.ts';
import { CategoryIcon } from './CategoryIcon.tsx';
import styles from './CategoryChip.module.css';

/**
 * A category tile: its line icon, in the category's tone colour, above its name. The same
 * tile in the category bar and the form; the set's grid gives every tile in it the same
 * width. (The hero has none: the bar under it already offers every category.)
 *   bar    — inside the category bar's white panel
 *   inset  — the form's category choice, on the white form card
 *
 * No count: the number of listings belongs in the results heading, not in the chip.
 * As a filter it toggles (aria-pressed); in the form it is one radio of a radiogroup.
 */
export function CategoryChip({
  category,
  label,
  icon,
  selected,
  variant,
  role = 'toggle',
  tabIndex,
  onSelect,
}: {
  /** null for "all categories" (no tone) */
  category: CategorySlug | null;
  label: string;
  icon: string;
  selected: boolean;
  variant: 'bar' | 'inset';
  role?: 'toggle' | 'radio';
  /** in a radio group, only one chip takes Tab (lib/radio.ts) */
  tabIndex?: number;
  onSelect: () => void;
}) {
  const a11y = role === 'radio' ? { role: 'radio', 'aria-checked': selected } : { 'aria-pressed': selected };
  const tone = category ? getCategory(category).tone : null;
  return (
    <button
      type="button"
      {...a11y}
      onClick={onSelect}
      tabIndex={tabIndex}
      data-tone={tone ?? undefined}
      className={['tap-area', styles.chip, styles[variant], selected && styles.selected].filter(Boolean).join(' ')}
    >
      <span className={styles.icon}><CategoryIcon path={icon} /></span>
      <span>{label}</span>
    </button>
  );
}
