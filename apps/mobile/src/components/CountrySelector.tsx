import { Pressable, StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { COUNTRIES, type CountryCode } from '@princess/shared/constants.ts';
import { px, shadow } from '@princess/tokens/native.ts';
import { FLAGS } from '@/flags';
import { c, r, s, shadows, sizes } from '@/theme';
import { Txt } from './Txt';

/**
 * The three-country selector (web: CountrySelector, "large" at phone width): a white pill, the
 * chosen country in pink. `inset`: inside the form card — the page colour, no shadow.
 */
export function CountrySelector({ value, onChange, inset = false }: { value: CountryCode; onChange: (k: CountryCode) => void; inset?: boolean }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="الدولة" style={[styles.group, inset ? styles.inset : styles.raised]}>
      {COUNTRIES.map((k) => {
        const on = k.code === value;
        return (
          <Pressable
            key={k.code}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(k.code)}
            style={[styles.option, on && styles.selected]}
          >
            <View style={styles.flag}>
              <SvgXml xml={FLAGS[k.code]} width={sizes.flagLg} height={(sizes.flagLg * 3) / 4} />
            </View>
            <Txt f="body600" size="text-body-sm" leading="leading-snug" color={on ? c.onAccent : c.textMuted}>{k.name}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', borderRadius: r.pill, gap: s[1], padding: px('space-selector-pad') },
  raised: { backgroundColor: c.surface, boxShadow: shadows.control },
  inset: { backgroundColor: c.canvas },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s[4],
    minHeight: sizes.control,
    paddingHorizontal: s[5],
    borderRadius: r.pill,
  },
  selected: { backgroundColor: c.accent },
  // a hairline edge so white stripes (EG, AE) do not dissolve into the white pill
  flag: { borderRadius: r.flag, overflow: 'hidden', boxShadow: shadow('shadow-flag') },
});
