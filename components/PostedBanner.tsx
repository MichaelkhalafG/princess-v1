import { CONTACT_EMAIL } from '@/lib/site.ts';
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
        {/* said at the moment she posts, because it is the thing she will assume exists */}
        <span className={styles.keep}>
          احتفظي برابط هذه الصفحة: لا يمكنكِ تعديل الإعلان أو حذفه بنفسك. لحذفه، راسلينا على{' '}
          <bdi dir="ltr">{CONTACT_EMAIL}</bdi> مع الرابط.
        </span>
      </div>
      <Button variant="surface" href={boardHref} className={styles.link}>العودة إلى اللوحة</Button>
    </div>
  );
}
