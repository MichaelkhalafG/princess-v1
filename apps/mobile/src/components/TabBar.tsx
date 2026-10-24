import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { ALL_CATEGORIES } from '@princess/shared/constants.ts';
import { num } from '@princess/tokens/native.ts';
import { COPY } from '@/copy';
import { appSizes, c, r, s, shadows, sizes } from '@/theme';
import { Txt } from './Txt';

/** Her listings' icon: the design's arch, a listing inside it (24-unit box, the category icons' line). */
const MINE_ICON = 'M5 21V11a7 7 0 0 1 14 0v10zM9 14.5h6M9 17.5h4';
/** The post item's glyph: a plus. */
const PLUS = 'M12 6v12M6 12h12';

const TABS: Record<string, { label: string; icon: string }> = {
  index: { label: COPY.tabBoard, icon: ALL_CATEGORIES.icon },
  'my-listings': { label: 'إعلاناتي', icon: MINE_ICON },
};

/**
 * The app's navigation, in place of the web's header and footer: the board, posting, her listings.
 * The board and her listings are tabs (each keeps its scroll and filters while she is in the
 * other); «اعرضي خدمتك» opens the form over whichever she is on.
 *
 * Most people opening the app are looking for someone, so posting is one item among three, the
 * same size as the tabs: easy to reach, never the loudest thing on the screen. Its only mark is a
 * small pink rounded square around its plus. The bar is the web
 * footer's ink band, rounded at the top, kept low; the chosen tab is lit, with the logo's disc
 * above it. It steps aside while the keyboard is up (the board's search).
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const keyboard = useKeyboardShown();
  if (keyboard) return null;
  const tabs = state.routes.filter((route) => TABS[route.name]);
  const tab = (route: (typeof state.routes)[number]) => {
    const focused = state.routes[state.index]?.key === route.key;
    const { label, icon } = TABS[route.name];
    const onPress = () => {
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigateToTab(route.key);
    };
    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={descriptors[route.key]?.options.tabBarAccessibilityLabel ?? label}
        onPress={onPress}
        style={styles.item}
      >
        {focused && <View style={styles.disc} />}
        <View style={styles.glyph}>
          <Svg width={appSizes.tabIcon} height={appSizes.tabIcon} viewBox="0 0 24 24" fill="none">
            <Path d={icon} stroke={focused ? c.onInk : c.footerText} strokeWidth={num('stroke-icon')} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
        <Txt f={focused ? 'body600' : 'body500'} size="text-caption" leading="leading-snug" color={focused ? c.onInk : c.footerText} numberOfLines={1}>{label}</Txt>
      </Pressable>
    );
  };
  return (
    <View accessibilityRole="tablist" style={[styles.bar, { paddingBottom: Math.max(insets.bottom, s[3]) }]}>
      {tabs[0] && tab(tabs[0])}
      <Pressable accessibilityRole="button" onPress={() => router.push('/new')} style={styles.item}>
        {({ pressed }) => (
          <>
            <View style={[styles.glyph, styles.post, pressed && { transform: [{ scale: num('scale-press') }] }]}>
              <Svg width={appSizes.tabIcon} height={appSizes.tabIcon} viewBox="0 0 24 24" fill="none">
                <Path d={PLUS} stroke={c.onAccent} strokeWidth={num('stroke-icon')} strokeLinecap="round" />
              </Svg>
            </View>
            <Txt f="body500" size="text-caption" leading="leading-snug" color={c.footerText} numberOfLines={1}>اعرضي خدمتك</Txt>
          </>
        )}
      </Pressable>
      {tabs[1] && tab(tabs[1])}
    </View>
  );
}

function useKeyboardShown() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const on = Keyboard.addListener('keyboardDidShow', () => setShown(true));
    const off = Keyboard.addListener('keyboardDidHide', () => setShown(false));
    return () => {
      on.remove();
      off.remove();
    };
  }, []);
  return shown;
}

/** The glyph's box: the icon with a little room, so the post item's arch fits the same row. */
const GLYPH = appSizes.tabIcon + s[5];

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: c.ink,
    paddingTop: s[5],
    paddingHorizontal: s[8],
    borderTopStartRadius: r.panel,
    borderTopEndRadius: r.panel,
    boxShadow: shadows.barUp,
  },
  item: { flex: 1, alignItems: 'center', gap: s[1], minHeight: sizes.hitMin },
  glyph: { width: GLYPH + s[5], height: GLYPH, alignItems: 'center', justifyContent: 'center' },
  // the chosen tab: the logo's disc, set into the bar's top edge above its icon
  disc: { position: 'absolute', top: -s[3], width: sizes.dotXs, height: sizes.dotXs, borderRadius: sizes.dotXs / 2, backgroundColor: c.logoDisc },
  // posting's mark: a plain pink rounded square, the same on every side (the arch is for photos and
  // cards: this small, its sweeping corner read as a mistake)
  post: { width: GLYPH, backgroundColor: c.accent, borderRadius: s[5] },
});
