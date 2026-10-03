import type { ReactNode } from 'react';
import { ArchMark } from './ArchMark.tsx';
import styles from './StatusPanel.module.css';

/** A centred white panel with an arch mark, for whole-page states (listing not found). */
export function StatusPanel({
  tone,
  title,
  body,
  children,
}: {
  tone: 'secondary' | 'highlight';
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <ArchMark size="status" tone={tone} className={styles.mark} />
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.body}>{body}</p>
      <div className={styles.actions}>{children}</div>
    </section>
  );
}
