import { Button } from './Button.tsx';
import styles from './EmptyState.module.css';

/** The panel shown when a filter combination has no listings. */
export function EmptyState({
  title,
  body,
  actionLabel,
  actionHref,
}: {
  title: string;
  body: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className={styles.panel}>
      <div className={styles.title}>{title}</div>
      <p className={styles.body}>{body}</p>
      <Button variant="accent" href={actionHref}>{actionLabel}</Button>
    </div>
  );
}
