import { Button } from '@/components/Button.tsx';
import { SiteFooter } from '@/components/SiteFooter.tsx';
import { SiteHeader } from '@/components/SiteHeader.tsx';
import { StatusPanel } from '@/components/StatusPanel.tsx';
import styles from './page.module.css';

// The design's copy names the listing's country ("تصفحي إعلانات مصر"), but a listing
// that does not exist has no country, so the board is named instead.
export default function ListingNotFound() {
  return (
    <div className={styles.page}>
      {/* not yet carrying the board context — see the "getting back" item (pending) */}
      <SiteHeader homeHref="/" backHref="/" />
      <main className={styles.main}>
        <span className={styles.blob} aria-hidden="true" />
        <StatusPanel
          tone="highlight"
          title="هذا الإعلان لم يعد على اللوحة"
          body="على اللوحة سيدات أخريات يقدمن الخدمة نفسها."
        >
          <Button variant="accent" href="/">تصفحي إعلانات اللوحة</Button>
          <Button variant="soft" href="/new">اعرضي خدمتك</Button>
        </StatusPanel>
      </main>
      <SiteFooter withDisclaimer />
    </div>
  );
}
