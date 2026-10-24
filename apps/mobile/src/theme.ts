// The app's design tokens: @princess/tokens (generated from the web's globals.css) in the shapes
// React Native styles take. No colour, size or shadow is written anywhere else in the app.
//
// What changes on the way from CSS (each is the nearest native equivalent):
//   - clamp(min, Nvw, max) sizes → fluid(name), computed from the window width at render;
//   - font-weight → a font family per weight: React Native ignores fontWeight for custom fonts
//     on Android, so "Alexandria 800" is its own family name;
//   - line-height ratios (1.65) → absolute line heights (fontSize × ratio), as React Native wants;
//   - box-shadow strings → boxShadow (React Native 0.76+ takes the same multi-layer syntax).

import { useWindowDimensions } from 'react-native';
import { color, fluid as fluidPx, num, px, ratio, shadow } from '@princess/tokens/native.ts';

export const c = {
  ink: color('color-ink'),
  inkHover: color('color-ink-hover'),
  onInk: color('color-on-ink'),
  accent: color('color-accent'),
  onAccent: color('color-on-accent'),
  secondary: color('color-secondary'),
  highlight: color('color-highlight'),
  canvas: color('color-canvas'),
  surface: color('color-surface'),
  tint: color('color-tint'),
  tintSoft: color('color-tint-soft'),
  tintAmber: color('color-tint-amber'),
  textSecondary: color('color-text-secondary'),
  textMuted: color('color-text-muted'),
  textSubtle: color('color-text-subtle'),
  textMutedOnInk: color('color-text-muted-on-ink'),
  divider: color('color-divider'),
  archEcho: color('color-arch-echo'),
  footerText: color('color-footer-text'),
  footerMuted: color('color-footer-muted'),
  footerDivider: color('color-footer-divider'),
  onContact: color('color-on-contact'),
  dropzoneBorder: color('color-dropzone-border'),
  logoInk: color('color-logo-ink'),
  logoDisc: color('color-logo-disc'),
  logoBlush: color('color-logo-blush'),
  decorDisc: color('color-decor-disc'),
} as const;

/** The category tone pairs (badge and no-photo panel), as the web's tones.module.css. */
export const tones = {
  accent: { bg: color('tone-accent-bg'), ink: color('tone-accent-ink') },
  secondary: { bg: color('tone-secondary-bg'), ink: color('tone-secondary-ink') },
  highlight: { bg: color('tone-highlight-bg'), ink: color('tone-highlight-ink') },
  ink: { bg: color('tone-ink-bg'), ink: color('tone-ink-ink') },
} as const;

/** The spacing scale, --space-1 … --space-17. */
export const s = Object.fromEntries(Array.from({ length: 17 }, (_, i) => [i + 1, px(`space-${i + 1}`)])) as Record<number, number>;

export const r = {
  card: px('radius-card'),
  media: px('radius-media'),
  field: px('radius-field'),
  panel: px('radius-panel'),
  section: px('radius-section'),
  flag: px('radius-flag'),
  pill: 999,
} as const;

export const shadows = {
  card: shadow('shadow-card'),
  cardHover: shadow('shadow-card-hover'),
  control: shadow('shadow-control'),
  controlCompact: shadow('shadow-control-compact'),
  catbar: shadow('shadow-catbar'),
  panel: shadow('shadow-panel'),
  cta: shadow('shadow-cta'),
  ctaAccent: shadow('shadow-cta-accent'),
  badge: shadow('shadow-badge'),
  monogram: shadow('shadow-monogram'),
  photoAccent: shadow('shadow-photo-accent'),
  /** the category bar's shadow turned upward, for the app's bars at the bottom of the screen */
  barUp: shadow('shadow-catbar').replace(/^0 (\d)/, '0 -$1'),
} as const;

export const sizes = {
  control: px('size-control'),
  controlSm: px('size-control-sm'),
  controlLg: px('size-control-lg'),
  dot: px('size-dot'),
  dotSm: px('size-dot-sm'),
  dotXs: px('size-dot-xs'),
  flag: px('size-flag'),
  flagLg: px('size-flag-lg'),
  tile: px('size-tile'),
  tileSm: px('size-tile-sm'),
  tileScroll: px('size-tile-scroll'),
  iconTile: px('size-icon-tile'),
  searchGlyph: px('size-search-glyph'),
  searchGlyphStroke: px('stroke-search-glyph'),
  fade: px('size-fade'),
  hairline: px('size-hairline'),
  borderField: px('border-field'),
  textareaMin: px('size-textarea-min'),
  badgeOverlap: px('space-badge-overlap'),
  areaMin: px('width-area-min'),
  icon: px('size-icon'),
  header: px('size-header'),
  hitMin: px('size-hit-min'),
} as const;

/** Sizes for the app's own components, which the web has no use for, built from the scale above. */
export const appSizes = {
  /** a tab's icon: the category icons' 24-unit box at 1:1 */
  tabIcon: s[15],
  /** her listing's photo in its row (her listings): two controls wide */
  thumb: sizes.control * 2,
} as const;

export const ratios = {
  media: ratio('ratio-media'),
  mediaLg: ratio('ratio-media-lg'),
  /** the arch's shoulder (the photo's top corner) as a share of the photo's width */
  shoulder: num('ratio-media-shoulder'),
} as const;

/** The font family for each family and weight the design uses (app/_layout.tsx loads them). */
export const font = {
  heading700: 'Alexandria_700Bold',
  heading800: 'Alexandria_800ExtraBold',
  body400: 'ReadexPro_400Regular',
  body500: 'ReadexPro_500Medium',
  body600: 'ReadexPro_600SemiBold',
  logo: 'Gabarito_700Bold',
} as const;

/** Font size and line height in one style, from a size token and a leading token. */
export function text(sizeToken: string, leadingToken = 'leading-body', width = 400) {
  const fontSize = fluidPx(sizeToken, width);
  return { fontSize, lineHeight: Math.round(fontSize * num(leadingToken)) };
}

/** A fluid length at the current window width (clamp(min, Nvw, max) in CSS). */
export function useFluid() {
  const { width } = useWindowDimensions();
  return (token: string) => fluidPx(token, width);
}

export { px, num };
