import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { num, px } from '@princess/tokens/native.ts';
import { c, r, s, shadows, sizes } from '@/theme';
import { Button } from './Button';
import { Logo } from './Logo';

/** web: SiteHeader's BACK_TO_BOARD — at phone width the pill shows the arrow only. */
const BACK_TO_BOARD = 'العودة إلى اللوحة';

/**
 * The header (web: SiteHeader at phone width): the logo (home), a back pill when there is a page to
 * go back to, and «اعرضي خدمتك» on every screen but the form itself.
 */
export function Header({ back = false, post = true }: { back?: boolean; post?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.start}>
        <Pressable accessibilityRole="link" onPress={() => router.dismissTo('/')} hitSlop={8}>
          <Logo size={px('text-logo-header-sm')} />
        </Pressable>
        {back && (
          <Pressable accessibilityRole="button" accessibilityLabel={BACK_TO_BOARD} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.back} hitSlop={6}>
            <Svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24" fill="none">
              <Path d="M9 6l6 6-6 6" stroke={c.ink} strokeWidth={num('stroke-back')} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        )}
      </View>
      {post && <Button variant="ink" compact onPress={() => router.push('/new')}>اعرضي خدمتك</Button>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: sizes.header,
    paddingHorizontal: s[11],
    gap: s[5],
    zIndex: 2,
  },
  start: { flexDirection: 'row', alignItems: 'center', gap: s[5] },
  back: {
    width: sizes.controlSm,
    height: sizes.controlSm,
    borderRadius: r.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.surface,
    boxShadow: shadows.controlCompact,
  },
});
