import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { getCategory, type CategorySlug } from '@princess/shared/constants.ts';
import { px } from '@princess/tokens/native.ts';
import { r, s, shadows, tones } from '@/theme';
import { CategoryIcon } from './CategoryIcon';
import { Txt } from './Txt';

/**
 * The category pill pinned to a photo (web: CategoryBadge): its icon and label in its tone, ringed
 * in white like a card. small: the board's half-width card; lg: the listing page.
 */
export function CategoryBadge({ category, size = 'default', style }: { category: CategorySlug; size?: 'default' | 'small' | 'lg'; style?: StyleProp<ViewStyle> }) {
  const k = getCategory(category);
  const tone = tones[k.tone];
  return (
    <View style={[styles.badge, size === 'small' && styles.small, size === 'lg' && styles.lg, { backgroundColor: tone.bg }, style]}>
      <CategoryIcon path={k.icon} color={tone.ink} />
      <Txt f="body600" size={size === 'lg' ? 'text-small' : 'text-caption'} leading="leading-snug" color={tone.ink} numberOfLines={1}>{k.label}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: s[2], paddingVertical: s[4], paddingHorizontal: s[9], borderRadius: r.pill, boxShadow: shadows.badge },
  small: { paddingVertical: s[2], paddingHorizontal: s[6] },
  lg: { paddingVertical: s[5], paddingHorizontal: px('space-badge-lg-pad-x') },
});
