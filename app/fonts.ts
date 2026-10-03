import { Alexandria, Gabarito, Readex_Pro } from 'next/font/google';

// Self-hosted at build time by next/font: no render-blocking stylesheet, and a
// size-adjusted fallback so the swap causes no layout shift.
// Only the weights the approved design actually uses.

export const headingFont = Alexandria({
  subsets: ['arabic', 'latin'],
  weight: ['700', '800'],
  display: 'swap',
  variable: '--font-heading',
});

// The logo wordmark only ("rincess"): Gabarito Bold, Latin glyphs only.
export const logoFont = Gabarito({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
  variable: '--font-logo',
});

export const bodyFont = Readex_Pro({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-body',
});
