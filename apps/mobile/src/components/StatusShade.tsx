import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { c } from '@/theme';

/**
 * The page colour behind the phone's status bar (the clock, the battery), so a page scrolling up
 * passes under it instead of through the icons. The web has no such strip: the browser's own bar
 * sits above the page.
 */
export function StatusShade() {
  const insets = useSafeAreaInsets();
  return <View pointerEvents="none" style={[styles.shade, { height: insets.top }]} />;
}

const styles = StyleSheet.create({
  shade: { position: 'absolute', top: 0, start: 0, end: 0, backgroundColor: c.canvas, zIndex: 3 },
});
