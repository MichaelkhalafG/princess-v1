import { Linking, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { fluid, px } from '@princess/tokens/native.ts';
import { WEB_URL } from '@/lib/config';
import { c, s, sizes } from '@/theme';
import { Logo } from './Logo';
import { Txt } from './Txt';

/** web: SiteFooter's ABOUT, word for word. */
const ABOUT = 'برينسيس لوحة إعلانات فقط: تعرض فيها السيدات خدماتهن وملابسهن، والاتفاق والدفع بينهن وبين العميلات مباشرة، دون أي عمولة.';

/**
 * The quiet footer (web: SiteFooter): ink, rounded at the top, the reversed logo, one line about
 * what Princess is, the few real links, the maker. The reading pages (how it works, terms, privacy)
 * open on the website — one text, one place to change it; «إعلاناتي» is the app's own screen.
 */
const PAGES: { label: string; open: () => void }[] = [
  { label: 'كيف يعمل؟', open: () => Linking.openURL(`${WEB_URL}/about#how`) },
  { label: 'تواصلي معنا', open: () => Linking.openURL(`${WEB_URL}/about#contact`) },
  { label: 'الشروط', open: () => Linking.openURL(`${WEB_URL}/terms`) },
  { label: 'الخصوصية', open: () => Linking.openURL(`${WEB_URL}/privacy`) },
  { label: 'إعلاناتي', open: () => router.push('/my-listings') },
];

export function Footer() {
  const { width } = useWindowDimensions();
  const radius = fluid('radius-footer', width);
  return (
    <View style={[styles.footer, { borderTopLeftRadius: radius, borderTopRightRadius: radius, paddingTop: fluid('pad-footer-top', width) }]}>
      <View style={styles.about}>
        <View style={styles.logo}>
          <Logo size={px('text-logo-footer')} variant="reversed" />
        </View>
        <Txt size="text-control" leading="leading-relaxed" color={c.footerText}>{ABOUT}</Txt>
      </View>
      <View accessibilityRole="menu" style={styles.links}>
        {PAGES.map((p) => (
          <Pressable key={p.label} accessibilityRole="link" onPress={p.open} hitSlop={8}>
            <Txt f="body500" size="text-body-sm" leading="leading-snug" color={c.footerText}>{p.label}</Txt>
          </Pressable>
        ))}
      </View>
      <View style={styles.bottom}>
        <Txt size="text-small" leading="leading-snug" color={c.footerMuted}>برينسيس — مشروع من MDN</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { backgroundColor: c.ink, paddingHorizontal: s[11], paddingBottom: s[17], gap: s[15] },
  about: { gap: s[8] },
  // the lockup is a left-to-right island: shrink it to its width so it starts on the right
  logo: { alignSelf: 'flex-start' },
  links: { flexDirection: 'row', flexWrap: 'wrap', columnGap: s[13], rowGap: s[8] },
  bottom: { borderTopWidth: sizes.hairline, borderTopColor: c.footerDivider, paddingTop: s[13] },
});
