import styles from './CategoryIcon.module.css';

/** A category's line icon: one path in a 24×24 box, taken from lib/constants.ts. */
export function CategoryIcon({ path, className }: { path: string; className?: string }) {
  return (
    <svg className={className ? `${styles.icon} ${className}` : styles.icon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={path} />
    </svg>
  );
}
