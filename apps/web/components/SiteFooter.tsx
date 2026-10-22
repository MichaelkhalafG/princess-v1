import { NO_BOARD_CONTEXT, withBoardContext, type BoardContext } from '@/lib/board-url.ts';
import { Logo } from './Logo.tsx';
import styles from './SiteFooter.module.css';

/** What Princess is, and that it takes no part in the deal — one line, on every page. */
export const ABOUT =
  'برينسيس لوحة إعلانات فقط: تعرض فيها السيدات خدماتهن وملابسهن، والاتفاق والدفع بينهن وبين العميلات مباشرة، دون أي عمولة.';

/** Only pages that exist are linked: a link that goes nowhere is worse than none. The
    first two open /about at their section. Each link keeps her board context. */
const PAGES = [
  { path: '/about', hash: '#how', label: 'كيف يعمل؟' },
  { path: '/about', hash: '#contact', label: 'تواصلي معنا' },
  { path: '/terms', hash: '', label: 'الشروط' },
  { path: '/privacy', hash: '', label: 'الخصوصية' },
];

/**
 * The one footer, on every page: small and quiet. The logo, one line about what
 * Princess is, the few real links, and who makes it. No category links — the category
 * bar is always within reach on the board.
 */
export function SiteFooter({ ctx = NO_BOARD_CONTEXT }: { ctx?: BoardContext }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.about}>
            {/* the approved logo, reversed (light on ink) */}
            <Logo variant="reversed" size="footer" className={styles.logo} />
            <p className={styles.line}>{ABOUT}</p>
          </div>
          <nav aria-label="روابط الموقع" className={styles.links}>
            {PAGES.map((p) => <a key={p.path + p.hash} href={`${withBoardContext(p.path, ctx)}${p.hash}`} className="tap-area">{p.label}</a>)}
          </nav>
        </div>
        <p className={styles.bottom}>برينسيس — مشروع من MDN</p>
      </div>
    </footer>
  );
}
