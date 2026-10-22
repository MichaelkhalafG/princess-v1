'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Button } from './Button.tsx';
import { Logo } from './Logo.tsx';
import styles from './SiteHeader.module.css';

export const BACK_TO_BOARD = 'العودة إلى اللوحة';

/**
 * The one header, on every page: identity plus one action, sticky.
 *
 *   logo    — home, i.e. the board exactly where she left it (homeHref carries country,
 *             category and search)
 *   back    — optional explicit "back to the board" (listing, form, not-found)
 *   center  — optional: the board puts its filter summary here once the category bar
 *             has scrolled away, so filters and header are one bar, not two
 *   postHref — "اعرضي خدمتك", visible at every width (a phone visitor on a listing or
 *             the form had no way to post); omitted on the form itself
 *   skip    — the skip link, the first keyboard stop on the page: to #main by default;
 *             the board sends it straight to its listings
 *
 * Transparent at the top of the page (the hero's orbs show through); a solid bar once
 * the page has scrolled.
 */
export function SiteHeader({
  homeHref,
  backHref,
  center,
  postHref,
  skip = { href: '#main', label: 'انتقلي إلى المحتوى' },
}: {
  homeHref: string;
  backHref?: string;
  center?: ReactNode;
  postHref?: string;
  skip?: { href: string; label: string };
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 4);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <a href={skip.href} className="skip-link">{skip.label}</a>
      <div className={styles.start}>
        <a href={homeHref} className={`tap-area ${styles.logo}`}>
          <Logo size="header" />
        </a>
        {backHref && (
          <a href={backHref} className={`tap-area ${styles.back}`} aria-label={BACK_TO_BOARD}>
            <svg className={styles.backIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              {/* points to the start side: "back" in a right-to-left page */}
              <path d="M9 6l6 6-6 6" />
            </svg>
            <span className={styles.backText}>{BACK_TO_BOARD}</span>
          </a>
        )}
      </div>
      <div className={styles.center}>{center}</div>
      {postHref && (
        <div className={styles.end}>
          <Button variant="ink" size="compact" href={postHref}>اعرضي خدمتك</Button>
        </div>
      )}
    </header>
  );
}
