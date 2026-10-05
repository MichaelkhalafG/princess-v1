import { Button } from './Button.tsx';
import styles from './EmptyState.module.css';

export type EmptyAction = { label: string; href?: string; onClick?: () => void };

/**
 * The panel shown when the board has nothing to list. The first action is the main way
 * out (accent); a second, if given, is the other one (soft) — e.g. "clear the search"
 * and "see all of the country", or "post" and "see every category".
 */
export function EmptyState({ title, body, actions }: {
  title: string;
  /** one paragraph, or several */
  body: string | readonly string[];
  actions: [EmptyAction, EmptyAction?];
}) {
  return (
    <div className={styles.panel} role="status">
      <div className={styles.title}>{title}</div>
      {(typeof body === 'string' ? [body] : body).map((p) => <p key={p} className={styles.body}>{p}</p>)}
      <div className={styles.actions}>
        {actions.filter((a): a is EmptyAction => Boolean(a)).map((a, i) => (
          a.href
            ? <Button key={a.label} variant={i === 0 ? 'accent' : 'soft'} href={a.href}>{a.label}</Button>
            : <Button key={a.label} variant={i === 0 ? 'accent' : 'soft'} onClick={a.onClick}>{a.label}</Button>
        ))}
      </div>
    </div>
  );
}
