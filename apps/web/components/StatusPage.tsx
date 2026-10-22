import type { ReactNode } from 'react';
import { boardHref, type BoardContext } from '@/lib/board-url.ts';
import { SiteFooter } from './SiteFooter.tsx';
import { SiteHeader } from './SiteHeader.tsx';
import { StatusPanel } from './StatusPanel.tsx';
import styles from './StatusPage.module.css';

/**
 * A whole-page state with one message and its ways out (the app-wide 404 and the error
 * pages): the site's header and footer around the status panel.
 */
export function StatusPage({ ctx, title, body, children }: { ctx: BoardContext; title: string; body: string; children: ReactNode }) {
  const home = boardHref(ctx);
  return (
    <div className={styles.page}>
      <SiteHeader homeHref={home} backHref={home} />
      <main id="main" tabIndex={-1} className={styles.main}>
        <span className={styles.blob} aria-hidden="true" />
        <StatusPanel title={title} body={body}>{children}</StatusPanel>
      </main>
      <SiteFooter ctx={ctx} />
    </div>
  );
}
