import type { ReactNode } from 'react';
import { boardHref, NO_BOARD_CONTEXT } from '@princess/shared/board-url.ts';
import { SiteFooter } from '@/components/SiteFooter.tsx';
import { SiteHeader } from '@/components/SiteHeader.tsx';
import formStyles from '@/components/form/ListingForm.module.css';
import pageStyles from '@/app/new/page.module.css';

/**
 * Her account's pages (sign in, a new password, her listings, a report): the posting form's
 * page and card, with a heading. Nothing here is styled of its own.
 */
export function AccountShell({ title, lead, children }: { title: string; lead?: ReactNode; children: ReactNode }) {
  const home = boardHref(NO_BOARD_CONTEXT);
  return (
    <div className={pageStyles.page}>
      <SiteHeader homeHref={home} backHref={home} />
      <main id="main" tabIndex={-1} className={pageStyles.main}>
        <span className={`${pageStyles.blob} ${pageStyles.blobTint}`} aria-hidden="true" />
        <div className={formStyles.intro}>
          <h1 className={formStyles.title}>{title}</h1>
          {lead && <p className={formStyles.lead}>{lead}</p>}
        </div>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

/** The card that holds a form or a message on these pages. */
export function AccountCard({ children, onSubmit }: { children: ReactNode; onSubmit?: (e: React.FormEvent) => void }) {
  return onSubmit
    ? <form className={formStyles.card} onSubmit={onSubmit} noValidate>{children}</form>
    : <div className={formStyles.card}>{children}</div>;
}

export { formStyles };
