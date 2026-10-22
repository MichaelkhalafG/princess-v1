import { getCategory, type CategorySlug } from '@/lib/constants.ts';
import { CategoryIcon } from './CategoryIcon.tsx';
import styles from './CategoryBadge.module.css';
import tones from './tones.module.css';

/**
 * The category pill pinned to a photo: the category's icon and label in its tone — the
 * same icon + tone the chips use, so a category looks like itself everywhere.
 *   default — on a card
 *   lg      — on the detail page photo
 */
export function CategoryBadge({ category, size = 'default', className }: { category: CategorySlug; size?: 'default' | 'lg'; className?: string }) {
  const c = getCategory(category);
  return (
    <span className={[styles.badge, size === 'lg' && styles.lg, tones[c.tone], className].filter(Boolean).join(' ')}>
      <CategoryIcon path={c.icon} />
      {c.label}
    </span>
  );
}
