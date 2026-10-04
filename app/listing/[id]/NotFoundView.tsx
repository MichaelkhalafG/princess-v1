'use client';

import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button.tsx';
import { SiteFooter } from '@/components/SiteFooter.tsx';
import { SiteHeader } from '@/components/SiteHeader.tsx';
import { StatusPanel } from '@/components/StatusPanel.tsx';
import { boardHref, readBoardContext, withBoardContext, type BoardContext } from '@/lib/board-url.ts';
import styles from './page.module.css';

/**
 * A listing that is gone. not-found receives no searchParams, so the board context she
 * came with (every card link carries it) is read here, on the client, and every way back
 * returns her to the board exactly as she left it.
 */
export function NotFoundFromUrl() {
  return <NotFoundView ctx={readBoardContext(useSearchParams())} />;
}

/** The same words as every other way back: "العودة إلى اللوحة". */
export function NotFoundView({ ctx }: { ctx: BoardContext }) {
  const home = boardHref(ctx);
  return (
    <div className={styles.page}>
      {/* no post button in the header: the panel offers it right below */}
      <SiteHeader homeHref={home} backHref={home} />
      <main id="main" tabIndex={-1} className={styles.main}>
        <span className={styles.blob} aria-hidden="true" />
        <StatusPanel
          title="هذا الإعلان لم يعد على اللوحة"
          body="على اللوحة سيدات أخريات يقدمن الخدمة نفسها."
        >
          <Button variant="accent" href={home}>العودة إلى اللوحة</Button>
          <Button variant="soft" href={withBoardContext('/new', ctx)}>اعرضي خدمتك</Button>
        </StatusPanel>
      </main>
      <SiteFooter ctx={ctx} />
    </div>
  );
}
