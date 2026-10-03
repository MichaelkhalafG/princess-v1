import { CATEGORIES, COUNTRIES } from '@/lib/constants.ts';
import { boardHref, type BoardContext } from '@/lib/board-url.ts';
import { CategoryIcon } from './CategoryIcon.tsx';
import { Logo } from './Logo.tsx';
import styles from './SiteFooter.module.css';

export const DISCLAIMER =
  'برينسيس لوحة إعلانات فقط. الاتفاق والدفع يتمّان مباشرة بين الطرفين، والموقع ليس طرفًا في أي تعامل ولا يضمن أي خدمة أو منتج.';

/** "متاح في مصر والسعودية والإمارات", from the country list. */
function availability(): string {
  const names = COUNTRIES.map((c) => c.name);
  return `متاح في ${names.slice(0, -1).join(' و')} و${names.at(-1)}`;
}

function Links() {
  return (
    // These pages are on hold until the design work is finished: the links lead to "#".
    <div className={styles.links}>
      <a href="#">كيف يعمل؟</a>
      <a href="#">الشروط</a>
      <a href="#">الخصوصية</a>
      <a href="#">تواصلي معنا</a>
    </div>
  );
}

/**
 * compact — the form
 * full    — the board and the listing page: the reversed logo, disclaimer, availability,
 *           and a link per category (keeping her country)
 */
export function SiteFooter({
  variant = 'compact',
  withDisclaimer = false,
  ctx,
}: {
  variant?: 'compact' | 'full';
  withDisclaimer?: boolean;
  /** full only: the category links keep her country */
  ctx?: BoardContext;
}) {
  if (variant === 'full') {
    const country = ctx?.country ?? COUNTRIES[0].code;
    return (
      <footer className={`${styles.footer} ${styles.full}`}>
        <div className={`${styles.inner} ${styles.fullInner}`}>
          <div className={styles.top}>
            <div className={styles.about}>
              {/* the approved logo, reversed (light on ink) */}
              <Logo variant="reversed" size="footer" className={styles.logo} />
              <p className={styles.fullDisclaimer}>{DISCLAIMER}</p>
              <span className={styles.availability}>{availability()}</span>
            </div>
            <div className={styles.cats}>
              {CATEGORIES.map((c) => (
                <a key={c.slug} className={styles.cat} data-tone={c.tone} href={boardHref({ country, category: c.slug, q: '' })}>
                  <span className={styles.catIcon}><CategoryIcon path={c.icon} /></span>
                  {c.label}
                </a>
              ))}
            </div>
          </div>
          <div className={`${styles.row} ${styles.bottom}`}>
            <span>برينسيس — مشروع من MDN</span>
            <Links />
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {withDisclaimer && <p className={styles.disclaimer}>{DISCLAIMER}</p>}
        <div className={styles.row}>
          <span>برينسيس — مشروع من MDN</span>
          <Links />
        </div>
      </div>
    </footer>
  );
}
