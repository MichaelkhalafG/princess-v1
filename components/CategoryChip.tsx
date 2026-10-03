import { toArabicDigits } from '@/lib/format.ts';
import { CategoryIcon } from './CategoryIcon.tsx';
import styles from './CategoryChip.module.css';

/**
 * A category chip with its icon (and, in the filters, its count).
 *   raised — the hero chips: white pill with a soft shadow
 *   bar    — inside the category bar: transparent until selected
 *   inset  — the form's category choice: page-colour pill on the white form card
 *
 * As a filter it toggles (aria-pressed); in the form it is one radio of a radiogroup.
 */
export function CategoryChip({
  label,
  icon,
  count,
  selected,
  variant,
  role = 'toggle',
  onSelect,
}: {
  label: string;
  icon: string;
  count?: number;
  selected: boolean;
  variant: 'raised' | 'bar' | 'inset';
  role?: 'toggle' | 'radio';
  onSelect: () => void;
}) {
  const a11y = role === 'radio' ? { role: 'radio', 'aria-checked': selected } : { 'aria-pressed': selected };
  return (
    <button
      type="button"
      {...a11y}
      onClick={onSelect}
      className={[styles.chip, styles[variant], selected && styles.selected].filter(Boolean).join(' ')}
    >
      <CategoryIcon path={icon} />
      <span>{label}</span>
      {count !== undefined && <span className={styles.count}>{toArabicDigits(count)}</span>}
    </button>
  );
}
