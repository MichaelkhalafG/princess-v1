import type { Metadata } from 'next';
import { COUNTRIES } from '@/lib/constants.ts';
import { boardHref, boardQuery, readBoardContext } from '@/lib/board-url.ts';
import { SiteFooter } from '@/components/SiteFooter.tsx';
import { SiteHeader } from '@/components/SiteHeader.tsx';
import { ListingForm } from '@/components/form/ListingForm.tsx';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'اعرضي خدمتك — برينسيس' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * /new?country=SA&category=…&q=… — she arrives from the board; the country preselects the
 * form, and the whole context is carried through to the posted listing so every route
 * back returns her to the board where she was.
 */
export default async function NewListingPage({ searchParams }: Props) {
  const ctx = readBoardContext(await searchParams);
  const initialCountry = ctx.country ?? COUNTRIES[0].code;
  const home = boardHref(ctx);
  return (
    <div className={styles.page}>
      {/* the form's one action is the way back; "post" would point at this page */}
      <SiteHeader homeHref={home} backHref={home} />
      <main className={styles.main}>
        <span className={`${styles.blob} ${styles.blobTint}`} aria-hidden="true" />
        <span className={`${styles.blob} ${styles.blobAmber}`} aria-hidden="true" />
        <ListingForm initialCountry={initialCountry} contextQuery={boardQuery(ctx)} />
      </main>
      <SiteFooter />
    </div>
  );
}
