import styles from './Logo.module.css';

/**
 * The approved logo: "The built P — full system" (Princess Logo System.dc.html, top
 * section only). A P built from a stem (8 × 32, radius 4) and a disc (r 13), sitting
 * INSIDE the word as its first letter; the rest of the word in Gabarito Bold.
 *
 * Variants (from the file):
 *   full     — ink stem, coral disc, ink word. Touching build. Blush or white ground.
 *   ink      — everything ink. SEAM build (disc 1.5 units clear of the stem), because in
 *              one colour the touching build closes into a lollipop at small sizes.
 *   reversed — everything blush, seam build. On the ink footer.
 *   onAccent — everything white, seam build. On a pink or teal fill.
 */
export type LogoVariant = 'full' | 'ink' | 'reversed' | 'onAccent';

export function LogoMark({ variant = 'full', className }: { variant?: LogoVariant; className?: string }) {
  const seam = variant !== 'full';
  return (
    <svg
      className={[styles.mark, styles[variant], className].filter(Boolean).join(' ')}
      viewBox={seam ? '0 0 36 32' : '0 0 34 32'}
      aria-hidden="true"
      focusable="false"
    >
      <rect className={styles.stem} x="0" y="0" width="8" height="32" rx="4" />
      <circle className={styles.disc} cx={seam ? 22.5 : 20} cy="13" r="13" />
    </svg>
  );
}

/**
 * The lockup: the mark stands in for the P of "Princess". Wrapped in <bdi dir="ltr"> so
 * the Latin word cannot drag the Arabic around it, the mark, or punctuation to the wrong
 * side of an RTL line. Screen readers get one word, "Princess" (not the visual "P" +
 * "rincess"), and no Arabic label — it is the brand's written name.
 */
export function Logo({ variant = 'full', size = 'header', className }: { variant?: LogoVariant; size?: 'header' | 'footer' | 'hero'; className?: string }) {
  return (
    <bdi dir="ltr" lang="en" className={[styles.lockup, styles[size], className].filter(Boolean).join(' ')}>
      <span className="visually-hidden">Princess</span>
      <span className={styles.visual} aria-hidden="true">
        <LogoMark variant={variant} className={styles.lockupMark} />
        <span className={`${styles.word} ${styles[`${variant}Word`]}`}>rincess</span>
      </span>
    </bdi>
  );
}
