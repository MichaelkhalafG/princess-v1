import { useCallback, useState } from 'react';
import { StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c } from '@/theme';

/**
 * The page colour behind the phone's status bar (the clock, the battery), so a page scrolling up
 * passes under it instead of through the icons. Only once the page has moved: at rest the strip
 * is not there, and the page's decorative circle runs on to the screen's top edge uncut. The web
 * has no such strip: the browser's own bar sits above the page.
 */
export function StatusShade({ shown }: { shown: boolean }) {
  const insets = useSafeAreaInsets();
  if (!shown) return null;
  return <View pointerEvents="none" style={[styles.shade, { height: insets.top }]} />;
}

/** Whether the page under the status bar has scrolled, and the onScroll that keeps it current. */
export function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const moved = e.nativeEvent.contentOffset.y > 0;
    setScrolled((was) => (was === moved ? was : moved));
  }, []);
  return [scrolled, onScroll] as const;
}

const styles = StyleSheet.create({
  shade: { position: 'absolute', top: 0, start: 0, end: 0, backgroundColor: c.canvas, zIndex: 3 },
});
