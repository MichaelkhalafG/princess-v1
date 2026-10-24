import { StyleSheet, View } from 'react-native';
import { px } from '@princess/tokens/native.ts';
import { c, r, s, shadows } from '@/theme';
import { Button } from './Button';
import { Txt } from './Txt';

export type EmptyAction = { label: string; onPress: () => void } | undefined;

/** A board state with nothing to show (web: EmptyState): a white panel, a title, a line or two, actions. */
export function EmptyState({ title, body, actions }: { title: string; body: string | string[]; actions: EmptyAction[] }) {
  const lines = Array.isArray(body) ? body : [body];
  const [first, ...rest] = actions.filter((a): a is NonNullable<EmptyAction> => !!a);
  return (
    <View style={styles.panel}>
      <Txt f="heading800" size="text-heading-sm" leading="leading-title" align="center" style={styles.title}>{title}</Txt>
      {lines.map((l) => (
        <Txt key={l} align="center" color={c.textSecondary} style={styles.body}>{l}</Txt>
      ))}
      <View style={styles.actions}>
        {first && <Button variant="accent" onPress={first.onPress}>{first.label}</Button>}
        {rest.map((a) => <Button key={a.label} variant="soft" onPress={a.onPress}>{a.label}</Button>)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: c.surface,
    borderRadius: r.panel,
    paddingTop: px('space-empty-pad-top'),
    paddingBottom: px('space-empty-pad-bottom'),
    paddingHorizontal: s[16],
    marginTop: s[5],
    boxShadow: shadows.panel,
  },
  title: { marginBottom: s[8] },
  body: { marginBottom: s[8] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: s[8], marginTop: s[6] },
});
