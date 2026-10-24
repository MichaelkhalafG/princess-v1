import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { num } from '@princess/tokens/native.ts';
import { c, r, s, shadows, sizes } from '@/theme';
import { Txt, ltr, type FontKey } from './Txt';

/**
 * The design's buttons, each the web's variant (components/Button.tsx):
 *   ink      — header "اعرضي خدمتك" (compact: the header's size)
 *   cta      — large ink action
 *   accent   — pink action (compact: the search's "ابحثي")
 *   contact  — the card's main contact button, with the teal dot
 *   round    — the card's secondary contact buttons
 *   submit   — the form's full-width pink action; `blocked` shows it waiting or busy
 *   soft     — tint pill, a secondary action (compact: smaller)
 *   surface  — white pill on a coloured banner
 *   text     — bare text action
 * Pressing dips the button (--scale-press), as on the web; nothing else animates.
 */
export type ButtonVariant = 'ink' | 'cta' | 'accent' | 'contact' | 'round' | 'submit' | 'soft' | 'surface' | 'text';

const PRESS = num('scale-press');

export function Button({
  variant,
  compact = false,
  blocked = false,
  value,
  onPress,
  children,
  style,
  accessibilityLabel,
}: {
  variant: ButtonVariant;
  compact?: boolean;
  /** waiting for something (the form's rule not met) or busy: the design's tint look */
  blocked?: boolean;
  /** the contact's number or handle beside its label (the listing page) */
  value?: string;
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const v = VARIANTS[variant];
  const box = [styles.base, v.box, compact && v.compactBox, blocked && styles.blocked];
  const label = { f: v.f, size: compact && v.compactSize ? v.compactSize : v.size, color: blocked ? c.ink : v.color };
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={compact || variant === 'text' ? 6 : undefined}
      style={({ pressed }) => [...box, style, pressed && !blocked && { transform: [{ scale: PRESS }] }]}
    >
      {variant === 'contact' && <View style={styles.dot} />}
      {typeof children === 'string' ? (
        <Txt f={label.f} size={label.size} leading="leading-snug" color={label.color} numberOfLines={1}>{children}</Txt>
      ) : children}
      {value && <Txt f="body500" size="text-control" leading="leading-snug" color={variant === 'contact' ? c.textMutedOnInk : c.textMuted} numberOfLines={1} style={styles.value}>{ltr(value)}</Txt>}
    </Pressable>
  );
}

type V = { box: ViewStyle; compactBox?: ViewStyle; f: FontKey; size: string; compactSize?: string; color: string };

const pill = { borderRadius: r.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' } as const;

const VARIANTS: Record<ButtonVariant, V> = {
  ink: {
    box: { ...pill, backgroundColor: c.ink, paddingVertical: s[8], paddingHorizontal: s[14], minHeight: sizes.control },
    compactBox: { minHeight: sizes.controlSm, paddingVertical: 0, paddingHorizontal: s[7] },
    f: 'heading700', size: 'text-control', compactSize: 'text-body-sm', color: c.onInk,
  },
  cta: {
    box: { ...pill, backgroundColor: c.ink, minHeight: sizes.controlLg, paddingHorizontal: s[17], boxShadow: shadows.cta },
    f: 'heading800', size: 'text-cta', color: c.onInk,
  },
  accent: {
    box: { ...pill, backgroundColor: c.accent, paddingVertical: s[10], paddingHorizontal: s[16], minHeight: sizes.control },
    compactBox: { paddingVertical: s[9], paddingHorizontal: s[13], minHeight: 0 },
    f: 'heading700', size: 'text-body', compactSize: 'text-control', color: c.onAccent,
  },
  contact: {
    box: { ...pill, flex: 1, gap: s[5], backgroundColor: c.ink, paddingVertical: s[9], paddingHorizontal: s[11], minHeight: sizes.control },
    f: 'heading700', size: 'text-control', color: c.onContact,
  },
  round: {
    box: { ...pill, minWidth: sizes.control, height: sizes.control, paddingHorizontal: s[7], backgroundColor: c.tintSoft },
    f: 'body600', size: 'text-small', color: c.ink,
  },
  submit: {
    box: { ...pill, width: '100%', minHeight: sizes.controlLg, paddingHorizontal: s[17], backgroundColor: c.accent, boxShadow: shadows.ctaAccent },
    f: 'heading800', size: 'text-cta', color: c.onAccent,
  },
  soft: {
    box: { ...pill, backgroundColor: c.tintSoft, paddingVertical: s[10], paddingHorizontal: s[15], minHeight: sizes.control },
    compactBox: { paddingVertical: s[9], paddingHorizontal: s[12], gap: s[7] },
    f: 'body600', size: 'text-body', compactSize: 'text-body-sm', color: c.ink,
  },
  surface: {
    box: { ...pill, backgroundColor: c.surface, paddingVertical: s[7], paddingHorizontal: s[11], minHeight: sizes.controlSm },
    f: 'body600', size: 'text-body-sm', color: c.ink,
  },
  text: {
    box: { ...pill, paddingVertical: s[3], minHeight: sizes.controlSm },
    f: 'body400', size: 'text-small', color: c.ink,
  },
};

const styles = StyleSheet.create({
  base: {},
  blocked: { backgroundColor: c.tint, boxShadow: 'none' },
  dot: { width: sizes.dot, height: sizes.dot, borderRadius: sizes.dot / 2, backgroundColor: c.secondary },
  value: { flexShrink: 1 },
});
