import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { ALL_CATEGORIES, CATEGORIES, type CategorySlug } from '@princess/shared/constants.ts';
import { c, r, s, shadows, sizes, tones } from '@/theme';
import { CategoryIcon } from './CategoryIcon';
import { Txt } from './Txt';

/**
 * The category bar at phone width (web: CategoryBar + CategoryChip "bar"): one row of tiles that
 * scrolls, «كل الفئات» first, each tile its line icon in the category's tone above its name; the
 * chosen one ink.
 *
 * The web fades the trailing edge with mask-image, which React Native lacks. The nearest
 * equivalent: a react-native-svg gradient from transparent to the bar's white laid over that
 * edge — the same look, except that it paints over the tiles instead of masking them (no
 * difference on the bar's solid white).
 */
export function CategoryBar({ value, onChange }: { value: CategorySlug | null; onChange: (slug: CategorySlug | null) => void }) {
  const items = [{ slug: null, label: ALL_CATEGORIES.label, icon: ALL_CATEGORIES.icon, tone: 'ink' as const }, ...CATEGORIES];
  return (
    <View style={styles.bar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((k) => {
          const on = k.slug === value;
          return (
            <Pressable
              key={k.slug ?? 'all'}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => onChange(k.slug)}
              style={[styles.tile, on && styles.selected]}
            >
              <CategoryIcon path={k.icon} color={on ? c.onInk : tones[k.tone].ink} size={sizes.iconTile} />
              <Txt f="body600" size="text-body-sm" leading="leading-card-title" color={on ? c.onInk : c.ink} numberOfLines={1}>{k.label}</Txt>
            </Pressable>
          );
        })}
      </ScrollView>
      {/* the trailing edge (the left, in RTL): "more this way" */}
      <View pointerEvents="none" style={styles.fade}>
        <Svg width={sizes.fade} height="100%">
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={c.surface} stopOpacity={1} />
              <Stop offset="1" stopColor={c.surface} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={sizes.fade} height="100%" fill="url(#fade)" />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: c.surface, boxShadow: shadows.catbar },
  row: { gap: s[5], paddingVertical: s[4], paddingStart: s[11], paddingEnd: s[11] + sizes.fade },
  tile: {
    minWidth: sizes.tileScroll,
    minHeight: sizes.tileSm,
    paddingHorizontal: s[10],
    paddingVertical: s[5],
    gap: s[3],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: r.field,
    backgroundColor: c.canvas,
  },
  selected: { backgroundColor: c.ink },
  fade: { position: 'absolute', end: 0, top: 0, bottom: 0, width: sizes.fade },
});
