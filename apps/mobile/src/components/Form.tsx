import type { ComponentRef, ReactNode, Ref } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import { edges, fluid, px } from '@princess/tokens/native.ts';
import { c, font, r, s, shadows, sizes } from '@/theme';
import { Blob } from './Blob';
import { Footer } from './Footer';
import { Header } from './Header';
import { Txt } from './Txt';

/**
 * A form screen (web: the posting form's page, and AccountShell for her account's pages): the header,
 * a large title and a lead, then the white form card(s), the footer under them. The keyboard pushes
 * the content up instead of covering the field she is typing in.
 */
export function FormScreen({ title, lead, post = true, amber = false, children, scrollRef }: { title: string; lead?: ReactNode; post?: boolean; amber?: boolean; children: ReactNode; scrollRef?: Ref<ComponentRef<typeof ScrollView>> }) {
  const { width } = useWindowDimensions();
  const gutter = fluid('gutter-page', width);
  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header back post={post} />
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={[styles.main, { paddingHorizontal: gutter, paddingBottom: fluid('pad-section-bottom', width) }]}>
          <Blob kind="form" />
          {amber && <Blob kind="amber" />}
          <View style={styles.intro}>
            <Txt f="heading800" size="text-form-title" leading="leading-display" accessibilityRole="header">{title}</Txt>
            {lead ? <Txt size="text-lead-sm" color={c.textSecondary}>{lead}</Txt> : null}
          </View>
          {children}
        </View>
        <Footer />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const CARD_PAD = edges('pad-form-card');

/** The white card that holds a form or a message (web: ListingForm's .card). */
export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

/** A titled section of a form card, apart from the one before by the form's hairline. */
export function Section({ title, aside, first = false, children }: { title?: string; aside?: ReactNode; first?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.section, !first && styles.sectionRule]}>
      {(title || aside) && (
        <View style={styles.sectionHead}>
          {title && <Txt f="heading700" size="text-body" leading="leading-snug" accessibilityRole="header">{title}</Txt>}
          {aside}
        </View>
      )}
      {children}
    </View>
  );
}

/** The error line under a field: a pink bullet and the message (web: FieldError). */
export function ErrorLine({ children, large = false }: { children: ReactNode; large?: boolean }) {
  return (
    <View style={styles.error} accessibilityRole="alert">
      <View style={[styles.bullet, large && styles.bulletLg]} />
      <Txt f={large ? 'body600' : 'body500'} size={large ? 'text-body-sm' : 'text-small'} leading="leading-snug" style={styles.errorText}>{children}</Txt>
    </View>
  );
}

/** One labelled field (web: Field): label row (a counter or «اختياري»), the control, a hint, the error. */
export function Field({ label, counter, optional, hint, error, children }: {
  label: string;
  counter?: { text: string; over: boolean };
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Txt f="heading700" size="text-body-sm" leading="leading-snug">{label}</Txt>
        {counter && <Txt f={counter.over ? 'body600' : 'body400'} size="text-caption" leading="leading-snug" color={counter.over ? c.ink : c.textSubtle}>{counter.text}</Txt>}
        {optional && <Txt size="text-caption" leading="leading-snug" color={c.textSubtle}>اختياري</Txt>}
      </View>
      {children}
      {hint ? (typeof hint === 'string' ? <Txt size="text-small" leading="leading-snug" color={c.textMuted}>{hint}</Txt> : hint) : null}
      {error && <ErrorLine>{error}</ErrorLine>}
    </View>
  );
}

/** A text field in the design's look: the page colour, a field radius, pink edge when wrong. */
export function Input({ invalid = false, multiline = false, ltr = false, inputRef, style, ...rest }: TextInputProps & { invalid?: boolean; ltr?: boolean; inputRef?: Ref<ComponentRef<typeof TextInput>> }) {
  return (
    <TextInput
      ref={inputRef}
      placeholderTextColor={c.textSubtle}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      {...rest}
      style={[styles.input, multiline && styles.textarea, invalid && styles.invalid, ltr && styles.ltr, style]}
    />
  );
}

/** A list of choices, one chosen — the radio group (used where the web has a <select>). */
export function Choices<T extends string>({ options, value, onChange, invalid = false }: { options: { value: T; label: string }[]; value: T | ''; onChange: (v: T) => void; invalid?: boolean }) {
  return (
    <View accessibilityRole="radiogroup" style={[styles.choices, invalid && styles.invalid]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChange(o.value)} style={[styles.choice, on && styles.choiceOn]}>
            <View style={[styles.radio, on && styles.radioOn]}>{on && <View style={styles.radioDot} />}</View>
            <Txt f={on ? 'body600' : 'body400'} size="text-control" leading="leading-snug" style={styles.choiceText}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.canvas },
  scroll: { flexGrow: 1, justifyContent: 'space-between' },
  main: { paddingTop: s[5], gap: s[15] },
  intro: { gap: s[7], paddingTop: s[11], paddingHorizontal: s[2] },
  card: {
    backgroundColor: c.surface,
    borderRadius: r.card,
    paddingTop: CARD_PAD.top,
    paddingBottom: CARD_PAD.bottom,
    paddingHorizontal: CARD_PAD.left,
    boxShadow: shadows.card,
    gap: s[16],
  },
  section: { gap: s[12] },
  sectionRule: { borderTopWidth: sizes.hairline, borderTopColor: c.tint, paddingTop: s[16] },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: s[7], flexWrap: 'wrap' },
  field: { gap: s[4] },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: s[7] },
  error: { flexDirection: 'row', gap: s[5], alignItems: 'flex-start' },
  bullet: { width: sizes.dotXs, height: sizes.dotXs, borderRadius: sizes.dotXs / 2, backgroundColor: c.accent, marginTop: px('offset-error-dot') },
  bulletLg: { marginTop: px('offset-error-dot-lg') },
  errorText: { flex: 1 },
  input: {
    backgroundColor: c.canvas,
    borderWidth: sizes.borderField,
    borderColor: c.canvas,
    borderRadius: r.field,
    paddingVertical: s[8],
    paddingHorizontal: s[8],
    minHeight: sizes.control,
    fontFamily: font.body400,
    fontSize: px('text-body'),
    color: c.ink,
  },
  textarea: { minHeight: sizes.textareaMin, paddingVertical: s[10] },
  invalid: { borderColor: c.accent },
  // a number, an email, a password: left to right, aligned left, whatever the page's direction
  ltr: { writingDirection: 'ltr', textAlign: 'left' },
  choices: { gap: s[3], borderRadius: r.field, borderWidth: sizes.borderField, borderColor: 'transparent' },
  choice: { flexDirection: 'row', alignItems: 'center', gap: s[8], minHeight: sizes.control, paddingHorizontal: s[8], borderRadius: r.field, backgroundColor: c.canvas },
  choiceOn: { backgroundColor: c.tintSoft },
  choiceText: { flex: 1 },
  // no radio on the web to copy (it has a <select>): sized from the spacing scale
  radio: { width: s[13], height: s[13], borderRadius: s[13] / 2, borderWidth: sizes.borderField, borderColor: c.textMuted, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: c.accent },
  radioDot: { width: s[7], height: s[7], borderRadius: s[7] / 2, backgroundColor: c.accent },
});
