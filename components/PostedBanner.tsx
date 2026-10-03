import { ArchMark } from './ArchMark.tsx';
import { Button } from './Button.tsx';
import styles from './PostedBanner.module.css';

/** Shown on the listing's own page right after she publishes it. */
export function PostedBanner({ countryName, boardHref }: { countryName: string; boardHref: string }) {
  return (
    <div role="status" className={styles.banner}>
      <ArchMark size="banner" tone="surface" />
      <div className={styles.text}>
        <span className={styles.title}>إعلانك الآن على اللوحة</span>
        <span className={styles.body}>يظهر لكل سيدة في {countryName} منذ هذه اللحظة. هكذا تراه العميلة.</span>
      </div>
      <Button variant="surface" href={boardHref} className={styles.link}>العودة إلى اللوحة</Button>
    </div>
  );
}
