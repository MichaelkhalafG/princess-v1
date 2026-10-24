import Svg, { Path } from 'react-native-svg';
import { num } from '@princess/tokens/native.ts';
import { sizes } from '@/theme';

/** A category's line icon: one path in a 24×24 box, from @princess/shared/constants.ts. */
export function CategoryIcon({ path, color, size = sizes.icon, stroke = num('stroke-icon') }: { path: string; color: string; size?: number; stroke?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>
      {/* the stroke is in the box's units: scale it so it keeps the design's weight at any size */}
      <Path d={path} stroke={color} strokeWidth={(stroke * 24) / size} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
