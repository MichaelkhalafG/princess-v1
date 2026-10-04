import { Button } from './Button.tsx';
import styles from './PostedBanner.module.css';

/** Shown on the listing's own page right after she publishes it. No mark: at banner
    size the built P does not read as a P (the logo file: a letter only from 48px). */
export function PostedBanner({ countryName, boardHref }: { countryName: string; boardHref: string }) {
  return (
    <div role="status" className={styles.banner}>
      <div className={styles.text}>
        <span className={styles.title}>إعلانك الآن على اللوحة</span>
        <span className={styles.body}>يظهر لكل سيدة في {countryName} منذ هذه اللحظة. هكذا تراه العميلة.</span>
      </div>
      <Button variant="surface" href={boardHref} className={styles.link}>العودة إلى اللوحة</Button>
    </div>
  );
}
