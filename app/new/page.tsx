import type { Metadata } from 'next';
import { COUNTRIES, isCountryCode } from '@/lib/constants.ts';
import { SiteFooter } from '@/components/SiteFooter.tsx';
import { SiteHeader } from '@/components/SiteHeader.tsx';
import { ListingForm } from '@/components/form/ListingForm.tsx';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'اعرضي خدمتك — برينسيس' };

/** /new?country=SA preselects the country she was browsing; otherwise the first one. */
export default async function NewListingPage({ searchParams }: { searchParams: Promise<{ country?: string }> }) {
  const { country } = await searchParams;
  const initialCountry = isCountryCode(country) ? country : COUNTRIES[0].code;
  return (
    <div className={styles.page}>
      <SiteHeader backHref="/" backLabel="العودة إلى اللوحة" />
      <main className={styles.main}>
        <span className={`${styles.blob} ${styles.blobTint}`} aria-hidden="true" />
        <span className={`${styles.blob} ${styles.blobAmber}`} aria-hidden="true" />
        <ListingForm initialCountry={initialCountry} />
      </main>
      <SiteFooter />
    </div>
  );
}
