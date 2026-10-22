/**
 * The logo's three colours for generated images (icons, Open Graph). next/og renders with
 * Satori, which cannot read CSS custom properties, so they are written out here. They must
 * equal --color-logo-ink / -disc / -blush in app/globals.css: tests/unit/brand.test.ts
 * compares them. The drawing itself is in lib/brand-images.tsx.
 */
export const BRAND = {
  ink: '#1C0A14',
  disc: '#EE6F9C',
  blush: '#FFF6F1',
} as const;
