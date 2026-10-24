import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { num } from '@princess/tokens/native.ts';
import { COPY } from '@/copy';
import { c, r, s, shadows, sizes } from '@/theme';

/** Back points to where the screen came from: the start side, the right in Arabic. */
const BACK = 'M9 6l6 6-6 6';
const CLOSE = 'M7 7l10 10M17 7L7 17';

/**
 * The bar over a pushed screen (in place of the web's header there): one round white button on the
 * reading side, floating over the top of the page as the web's header does (the page's decorative
 * circle runs on under it to the screen's edge); the page leaves `topBarSpace` free for it.
 * `back` returns to the screen under it; `close` ends a task (the form) and drops it. The screen's
 * own large title follows in the content, so the bar carries no title and no logo: the tab bar
 * under the board and her listings is where she finds her way around.
 */
export function TopBar({ kind = 'back', fallback = '/' }: { kind?: 'back' | 'close'; fallback?: Href }) {
  const insets = useSafeAreaInsets();
  const leave = () => (router.canGoBack() ? router.back() : router.replace(fallback));
  return (
    <View pointerEvents="box-none" style={[styles.bar, { paddingTop: insets.top + s[3] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={kind === 'close' ? COPY.close : COPY.back}
        onPress={leave}
        hitSlop={8}
        style={({ pressed }) => [styles.button, pressed && { transform: [{ scale: num('scale-press') }] }]}
      >
        <Svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24" fill="none">
          <Path d={kind === 'close' ? CLOSE : BACK} stroke={c.ink} strokeWidth={num('stroke-back')} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
    </View>
  );
}

/** The height the bar takes at the top of the page under it. */
export const topBarSpace = (insets: EdgeInsets) => insets.top + s[3] + sizes.control + s[3];

const styles = StyleSheet.create({
  bar: { position: 'absolute', top: 0, start: 0, flexDirection: 'row', paddingHorizontal: s[11], zIndex: 2 },
  button: {
    width: sizes.control,
    height: sizes.control,
    borderRadius: r.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    boxShadow: shadows.controlCompact,
  },
});
