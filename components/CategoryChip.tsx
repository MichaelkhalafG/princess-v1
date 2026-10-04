import type { CategorySlug } from '@/lib/constants.ts';
import { getCategory } from '@/lib/constants.ts';
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
  variant: 'raised' | 'bar' | 'inset';
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
