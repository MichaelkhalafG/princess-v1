import type { ReactNode } from 'react';
import { ArchMark } from './ArchMark.tsx';
import styles from './SiteHeader.module.css';

/** Logo on the start side, a "back to the board" pill on the end side. */
export function SiteHeader({ backHref, backLabel }: { backHref: string; backLabel: ReactNode }) {
  return (
    <header className={styles.header}>
      <a href="/" className={styles.logo}>
        <ArchMark size="logo" tone="accent" />
        <span className={styles.logoText}>برينسيس</span>
      </a>
      <a href={backHref} className={styles.back}>
        <span className={styles.dot} aria-hidden="true" />
        {backLabel}
      </a>
    </header>
  );
}
