import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { num, px } from '@princess/tokens/native.ts';
import { WEB_URL } from '@/lib/config';
import { c, r, s, shadows, sizes } from '@/theme';
import { LogoMark } from './Logo';
import { Txt } from './Txt';

/** web: SiteFooter's ABOUT, word for word. */
const ABOUT = 'برينسيس لوحة إعلانات فقط: تعرض فيها السيدات خدماتهن وملابسهن، والاتفاق والدفع بينهن وبين العميلات مباشرة، دون أي عمولة.';

/** The footer's pages (web: SiteFooter). They open on the website: one text, one place to change it. */
const PAGES = [
  { label: 'كيف يعمل؟', path: '/about#how' },
  { label: 'تواصلي معنا', path: '/about#contact' },
  { label: 'الشروط', path: '/terms' },
  { label: 'الخصوصية', path: '/privacy' },
];

/** Onward, toward the end side: the left in Arabic. */
const ONWARD = 'M15 6l-6 6 6 6';

/**
 * What the web's footer says, where a phone keeps it: at the end of her own tab, as a short list
 * of rows rather than a band under every screen. The one line about what Princess is, the pages,
 * the maker.
 */
export function About() {
  return (
    <View style={styles.about}>
      <View style={styles.lead}>
        <LogoMark height={px('size-status-mark') / 2} />
        <Txt size="text-body-sm" leading="leading-relaxed" color={c.textSecondary} style={styles.leadText}>{ABOUT}</Txt>
      </View>
      <View style={styles.list}>
        {PAGES.map((p, i) => (
          <Pressable
            key={p.path}
            accessibilityRole="link"
            onPress={() => Linking.openURL(`${WEB_URL}${p.path}`)}
            style={({ pressed }) => [styles.row, i > 0 && styles.rowRule, pressed && styles.rowPressed]}
          >
            <Txt f="body500" size="text-body" leading="leading-snug" style={styles.rowText}>{p.label}</Txt>
            <Svg width={sizes.icon} height={sizes.icon} viewBox="0 0 24 24" fill="none">
              <Path d={ONWARD} stroke={c.textSubtle} strokeWidth={num('stroke-back')} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        ))}
      </View>
      <Txt size="text-small" leading="leading-snug" color={c.textSubtle} align="center">برينسيس — مشروع من MDN</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  about: { gap: s[11], marginTop: s[8] },
  lead: { flexDirection: 'row', gap: s[8], alignItems: 'flex-start', paddingHorizontal: s[2] },
  leadText: { flex: 1 },
  list: { backgroundColor: c.surface, borderRadius: r.panel, boxShadow: shadows.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: s[8], minHeight: sizes.controlLg, paddingHorizontal: s[13] },
  rowRule: { borderTopWidth: sizes.hairline, borderTopColor: c.tint },
  rowPressed: { backgroundColor: c.tintSoft },
  rowText: { flex: 1 },
});
