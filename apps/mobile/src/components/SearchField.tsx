import { StyleSheet, TextInput, View } from 'react-native';
import { fluid } from '@princess/tokens/native.ts';
import { c, font, r, s, shadows, sizes } from '@/theme';
import { Button } from './Button';

/**
 * The search pill (web: SearchField): a pink ring, the field, and «ابحثي». `busy`: new results are
 * on their way (a search, a country) — its button shows the spinner, on the first screen where she
 * acted; the result count saying so is below the fold.
 */
export function SearchField({ value, placeholder, onChange, onSubmit, busy = false }: { value: string; placeholder: string; onChange: (v: string) => void; onSubmit: () => void; busy?: boolean }) {
  return (
    <View style={styles.field}>
      <View style={styles.glyph} />
      <TextInput
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={c.textSubtle}
        returnKeyType="search"
        accessibilityLabel="ابحثي في الإعلانات"
        style={styles.input}
      />
      <Button variant="accent" compact busy={busy} onPress={onSubmit}>ابحثي</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s[5],
    backgroundColor: c.surface,
    borderRadius: r.pill,
    paddingVertical: s[3],
    paddingStart: s[13],
    paddingEnd: s[3],
    boxShadow: shadows.control,
  },
  glyph: { width: sizes.searchGlyph, height: sizes.searchGlyph, borderRadius: sizes.searchGlyph, borderWidth: sizes.searchGlyphStroke, borderColor: c.accent },
  input: { flex: 1, minHeight: sizes.control, fontFamily: font.body400, fontSize: fluid('text-body', 400), color: c.ink, paddingHorizontal: s[2], textAlign: 'right' },
});
