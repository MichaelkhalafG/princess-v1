import { ImageResponse } from 'next/og';
import { APPLE_ICON, IconTile } from '@/lib/brand-images.tsx';

// Home-screen icon, 180 × 180, full-bleed (iOS rounds it). See lib/brand-images.tsx.
export const size = { width: APPLE_ICON.size, height: APPLE_ICON.size };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(<IconTile size={APPLE_ICON.size} mark={APPLE_ICON.mark} />, size);
}
