import { BRAND } from './brand.ts';

/**
 * The built P for generated images (icons, Open Graph), drawn for next/og. Geometry is
 * the approved file's ("The built P — full system"): stem 8 × 32 radius 4, disc r 13 at
 * (20, 13), touching — the full-colour build; components/Logo.tsx draws the same mark for
 * the page. Colours come from lib/brand.ts.
 */

/** viewBox width / height of the full-colour (touching) build. */
export const MARK_RATIO = 34 / 32;

/** The full-colour mark at a given pixel height, for an ImageResponse. */
export function BrandMark({ height, style }: { height: number; style?: Record<string, string | number> }) {
  return (
    <svg width={height * MARK_RATIO} height={height} viewBox="0 0 34 32" style={style}>
      <rect x="0" y="0" width="8" height="32" rx="4" fill={BRAND.ink} />
      <circle cx="20" cy="13" r="13" fill={BRAND.disc} />
    </svg>
  );
}

/**
 * Favicon / app-icon tiles from the file: blush tile, full-colour P at about 60% height.
 * 16 and 32 are the file's own hand-set values (10 px mark / radius 3; 19 px / radius 7).
 * The 180 app icon is full-bleed: iOS rounds the corners itself, and a pre-rounded tile
 * would show black corners there.
 */
export const ICON_TILES = [
  { id: '16', size: 16, mark: 10, radius: 3 },
  { id: '32', size: 32, mark: 19, radius: 7 },
] as const;

export const APPLE_ICON = { size: 180, mark: 108 } as const;

export function IconTile({ size, mark, radius = 0 }: { size: number; mark: number; radius?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: BRAND.blush,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <BrandMark height={mark} />
    </div>
  );
}
