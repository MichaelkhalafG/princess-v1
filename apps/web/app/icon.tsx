import { ImageResponse } from 'next/og';
import { ICON_TILES, IconTile } from '@/lib/brand-images.tsx';

// The browser-tab icon at 16 and 32, each drawn at its own size (not one image scaled),
// from the logo file's favicon spec. See lib/brand-images.tsx.
export function generateImageMetadata() {
  return ICON_TILES.map((t) => ({ id: t.id, size: { width: t.size, height: t.size }, contentType: 'image/png' }));
}

export default async function Icon({ id }: { id: Promise<string> }) {
  const wanted = await id;
  const tile = ICON_TILES.find((t) => t.id === wanted) ?? ICON_TILES[1];
  return new ImageResponse(<IconTile size={tile.size} mark={tile.mark} radius={tile.radius} />, {
    width: tile.size,
    height: tile.size,
  });
}
