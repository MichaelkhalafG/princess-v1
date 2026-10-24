import { useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ACCOUNT_MESSAGES, failureMessage } from '@princess/shared/messages.ts';
import { api } from '@/lib/api';
import { Button } from '@/components/Button';
import { Card, ErrorLine, Field, FormScreen, Input, Section } from '@/components/Form';
import { Txt } from '@/components/Txt';
import { c, s } from '@/theme';

/**
 * She asks for a link to choose a new password (web: app/forgot-password + ForgotPasswordForm).
 * The answer is the same whether or not the email has an account. The link in the email opens the
 * web's reset page in her browser; she signs in here again afterwards.
 */
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);

  const submit = async () => {
    if (busy) return;
    if (email.trim() === '') {
      setError(ACCOUNT_MESSAGES.email.required);
      return emailRef.current?.focus();
    }
    setBusy(true);
    const res = await api('POST', '/password/forgot', { email });
    setBusy(false);
    if (res.ok) setSent(true);
    else if (res.errors.email) {
      setError(ACCOUNT_MESSAGES.email[res.errors.email] ?? ACCOUNT_MESSAGES.email.invalid);
      emailRef.current?.focus();
    } else setMessage(failureMessage(res));
  };

  return (
    <FormScreen title="نسيتِ كلمة المرور؟" lead="اكتبي بريدك الإلكتروني، ونرسل إليه رابطًا لتعيين كلمة مرور جديدة." post={false}>
      <Card>
        {sent ? (
          <>
            <Txt size="text-lead-sm" color={c.textSecondary} accessibilityRole="alert">إن كان لهذا البريد حساب، فقد أرسلنا إليه رابطًا لتعيين كلمة مرور جديدة. الرابط صالح لمدة ٦٠ دقيقة.</Txt>
            <Button variant="soft" onPress={() => router.replace('/sign-in')}>سجّلي الدخول</Button>
          </>
        ) : (
          <>
            <Section first>
              <Field label="البريد الإلكتروني" error={error}>
                <Input inputRef={emailRef} ltr value={email} onChangeText={(v) => { setEmail(v); setError(undefined); }} invalid={!!error}
                  placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" returnKeyType="send" onSubmitEditing={submit} />
              </Field>
            </Section>
            <View style={styles.submit}>
              {message && <ErrorLine large>{message}</ErrorLine>}
              <Button variant="submit" blocked={busy} onPress={submit}>{busy ? 'لحظات…' : 'أرسلي الرابط'}</Button>
            </View>
          </>
        )}
      </Card>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  submit: { gap: s[8] },
});
