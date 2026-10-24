import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { em } from '@princess/tokens/native.ts';
import { c, font } from '@/theme';

/**
 * The approved logo (web: components/Logo.tsx): the built P — a stem and a disc — standing in
 * for the P of "Princess", the rest of the word in Gabarito Bold. Always laid out left to right,
 * whatever the page's direction. `variant`: full (ink and coral) or reversed (blush, on the ink
 * footer; the seam build, disc clear of the stem).
 */
export function Logo({ size, variant = 'full' }: { size: number; variant?: 'full' | 'reversed' }) {
  const seam = variant !== 'full';
  const markHeight = size * em('logo-mark-height');
  const stem = seam ? c.logoBlush : c.logoInk;
  const disc = seam ? c.logoBlush : c.logoDisc;
  return (
    <View style={styles.lockup} accessible accessibilityLabel="Princess" accessibilityRole="header">
      <Svg width={(markHeight * (seam ? 36 : 34)) / 32} height={markHeight} viewBox={seam ? '0 0 36 32' : '0 0 34 32'} style={{ marginBottom: size * em('logo-mark-baseline') }}>
        <Rect x={0} y={0} width={8} height={32} rx={4} fill={stem} />
        <Circle cx={seam ? 22.5 : 20} cy={13} r={13} fill={disc} />
      </Svg>
      <Text
        style={{ fontFamily: font.logo, fontSize: size, lineHeight: size * 1.05, color: seam ? c.logoBlush : c.logoInk, letterSpacing: size * em('tracking-logo-word'), marginLeft: size * em('logo-word-gap') }}
        accessible={false}
      >
        rincess
      </Text>
    </View>
  );
}

/** The mark alone (the P), for small places. */
export function LogoMark({ height }: { height: number }) {
  return (
    <Svg width={(height * 34) / 32} height={height} viewBox="0 0 34 32" accessible={false}>
      <Rect x={0} y={0} width={8} height={32} rx={4} fill={c.logoInk} />
      <Circle cx={20} cy={13} r={13} fill={c.logoDisc} />
    </Svg>
  );
}

// direction: 'ltr' keeps the mark before the word in an RTL app (the web's <bdi dir="ltr">)
const styles = StyleSheet.create({
  lockup: { flexDirection: 'row', alignItems: 'flex-end', direction: 'ltr' },
});
