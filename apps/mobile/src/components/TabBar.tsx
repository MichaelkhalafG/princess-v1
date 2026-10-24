import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { ALL_CATEGORIES } from '@princess/shared/constants.ts';
import { fluid, num } from '@princess/tokens/native.ts';
import { DRAFT } from '@/drafts';
import { appSizes, c, r, s, shadows, sizes } from '@/theme';
import { Txt } from './Txt';

/** Her listings' icon: the design's arch, a listing inside it (24-unit box, the category icons' line). */
const MINE_ICON = 'M5 21V11a7 7 0 0 1 14 0v10zM9 14.5h6M9 17.5h4';

const TABS: Record<string, { label: string; icon: string }> = {
  index: { label: DRAFT.tabBoard, icon: ALL_CATEGORIES.icon },
  'my-listings': { label: 'إعلاناتي', icon: MINE_ICON },
};

/**
 * The app's navigation, in place of the web's header and footer. Two places and one task:
 * the board and her listings are tabs (each keeps its scroll and filters while she is in the
 * other), and «اعرضي خدمتك» between them opens the form over whichever she is on.
 *
 * The bar is the web footer's ink band, rounded at the top the same way, moved to where a phone's
 * thumb is. The chosen tab is marked with the logo's disc. The post button is the one bold thing:
 * pink, shaped as the cards' photos are — one top corner, on the reading side, sweeping in the
 * design's arch — and standing half out of the band. The bar steps aside while the keyboard is up (the board's search).
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const keyboard = useKeyboardShown();
  if (keyboard) return null;
  const radius = fluid('radius-footer', width);
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
        style={styles.tab}
      >
        <View style={[styles.disc, !focused && styles.discOff]} />
        <Svg width={appSizes.tabIcon} height={appSizes.tabIcon} viewBox="0 0 24 24" fill="none">
          <Path d={icon} stroke={focused ? c.onInk : c.footerText} strokeWidth={num('stroke-icon')} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Txt f={focused ? 'body600' : 'body500'} size="text-small" leading="leading-snug" color={focused ? c.onInk : c.footerText} numberOfLines={1}>{label}</Txt>
      </Pressable>
    );
  };
  return (
    <View accessibilityRole="tablist" style={[styles.bar, { borderTopStartRadius: radius, borderTopEndRadius: radius, paddingBottom: Math.max(insets.bottom, s[5]) }]}>
      {tabs[0] && tab(tabs[0])}
      <View style={styles.postSlot}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/new')}
          style={({ pressed }) => [styles.post, pressed && { transform: [{ scale: num('scale-press') }] }]}
        >
          <Txt f="heading800" size="text-control" leading="leading-snug" color={c.onAccent} numberOfLines={1}>اعرضي خدمتك</Txt>
        </Pressable>
      </View>
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

const POST_HEIGHT = sizes.controlLg;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: c.ink,
    paddingTop: s[5],
    paddingHorizontal: s[8],
    boxShadow: shadows.barUp,
  },
  tab: { flex: 1, alignItems: 'center', gap: s[2], minHeight: sizes.hitMin, paddingBottom: s[2] },
  // the logo's disc over the chosen tab; kept (transparent) on the others so the icons line up
  disc: { width: sizes.dotSm, height: sizes.dotSm, borderRadius: sizes.dotSm / 2, backgroundColor: c.logoDisc, marginBottom: s[1] },
  discOff: { backgroundColor: 'transparent' },
  postSlot: { flex: 1.4, alignItems: 'center' },
  // the arch: the reading-side top corner sweeps, the others are softly rounded; half out of the band
  post: {
    marginTop: -POST_HEIGHT / 2,
    height: POST_HEIGHT,
    paddingHorizontal: s[13],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accent,
    borderRadius: r.field,
    borderTopStartRadius: POST_HEIGHT,
    boxShadow: shadows.ctaAccent,
  },
});
