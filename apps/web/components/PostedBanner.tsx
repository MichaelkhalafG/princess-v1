import { Button } from './Button.tsx';
import styles from './PostedBanner.module.css';

/** Shown on the listing's own page when it went straight onto the board (a trusted account).
    No mark: at banner size the built P does not read as a P (the logo file: a letter only from
    48px). ARABIC COPY: the last line is a DRAFT; the first two are unchanged. */
export function PostedBanner({ countryName, boardHref }: { countryName: string; boardHref: string }) {
  return (
    <div role="status" className={styles.banner}>
      <div className={styles.text}>
        <span className={styles.title}>إعلانك الآن على اللوحة</span>
        <span className={styles.body}>يظهر لكل سيدة في {countryName} منذ هذه اللحظة. هكذا تراه العميلة.</span>
        <span className={styles.keep}>
          تجدين إعلاناتك في صفحة <a href="/my-listings">إعلاناتي</a>، ومنها تحذفين أيًّا منها متى شئتِ.
        </span>
      </div>
      <Button variant="surface" href={boardHref} className={styles.link}>العودة إلى اللوحة</Button>
    </div>
  );
}

/** The same strip on her listings page, right after she sends one that waits: the news, and
    what happens next. */
export function SentBanner({ title, body }: { title: string; body: string }) {
  return (
    <div role="status" className={styles.banner}>
      <div className={styles.text}>
        <span className={styles.title}>{title}</span>
        <span className={styles.body}>{body}</span>
      </div>
    </div>
  );
}
