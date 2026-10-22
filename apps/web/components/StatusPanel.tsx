import type { ReactNode } from 'react';
import { LogoMark } from './Logo.tsx';
import styles from './StatusPanel.module.css';

/** A centred white panel signed with the built P, for whole-page states (listing not found). */
export function StatusPanel({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <LogoMark variant="full" className={styles.mark} />
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.body}>{body}</p>
      <div className={styles.actions}>{children}</div>
    </section>
  );
}
