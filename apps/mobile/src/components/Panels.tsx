import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { px } from '@princess/tokens/native.ts';
import { c, r, s, shadows } from '@/theme';
import { LogoMark } from './Logo';
import { Txt } from './Txt';

/** A whole-screen state (web: StatusPanel): the built P, a title, one line, actions. */
export function StatusPanel({ title, body, children }: { title: string; body: string; children: ReactNode }) {
  return (
    <View style={styles.status}>
      <LogoMark height={px('size-status-mark')} />
      <Txt f="heading800" size="text-notfound-title" leading="leading-notfound-title" align="center">{title}</Txt>
      <Txt align="center" color={c.textSecondary}>{body}</Txt>
      <View style={styles.statusActions}>{children}</View>
    </View>
  );
}

/**
 * The teal strip for news about her listing (web: PostedBanner / SentBanner): a title, a line or
 * two, and an optional action on it.
 */
export function Banner({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <Txt f="heading800" size="text-banner-title" leading="leading-title" color={c.onAccent} style={styles.bannerTitle}>{title}</Txt>
      {children}
      {action && <View style={styles.bannerAction}>{action}</View>}
    </View>
  );
}

/** A line of the banner's body. */
export function BannerLine({ children }: { children: ReactNode }) {
  return <Txt size="text-body-sm" leading="leading-snug" color={c.onAccent}>{children}</Txt>;
}

const styles = StyleSheet.create({
  status: {
    backgroundColor: c.surface,
    borderRadius: r.panel,
    borderTopStartRadius: px('radius-panel-shoulder'),
    paddingTop: px('space-status-pad-top'),
    paddingBottom: px('space-empty-pad-bottom'),
    paddingHorizontal: s[16],
    alignItems: 'center',
    gap: s[11],
    boxShadow: shadows.panel,
  },
  statusActions: { alignItems: 'center', gap: s[8], marginTop: s[5] },
  banner: { backgroundColor: c.secondary, borderRadius: r.panel, paddingVertical: s[15], paddingHorizontal: s[13], gap: s[3] },
  bannerTitle: { marginBottom: s[5] },
  bannerAction: { alignItems: 'flex-start', marginTop: s[11] },
});
