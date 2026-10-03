import { getCategory, type CategorySlug } from '@/lib/constants.ts';
import styles from './CategoryBadge.module.css';
import tones from './tones.module.css';

/**
 * The category pill pinned to a photo. Colours come from the category's tone.
 *   default — on a card (white ring)
 *   lg      — on the detail page photo (larger, ring in the page colour)
 */
export function CategoryBadge({ category, size = 'default', className }: { category: CategorySlug; size?: 'default' | 'lg'; className?: string }) {
  const c = getCategory(category);
  return <span className={[styles.badge, size === 'lg' && styles.lg, tones[c.tone], className].filter(Boolean).join(' ')}>{c.label}</span>;
}
