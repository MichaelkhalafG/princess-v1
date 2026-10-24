import { useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ACCOUNT_MESSAGES, failureMessage, signInErrors, type SignInErrors } from '@princess/shared/messages.ts';
import { DEVICE_NAME, api } from '@/lib/api';
import { setToken } from '@/lib/session';
import { Button } from '@/components/Button';
import { Card, ErrorLine, Field, FormScreen, Input, Section } from '@/components/Form';
import { Txt } from '@/components/Txt';
import { c, s } from '@/theme';

/** Only her own screens are a place to go back to after signing in; anything else is her listings. */
const NEXT = ['/my-listings', '/new'] as const;
const safeNext = (next: string | undefined) => (NEXT as readonly string[]).includes(next ?? '') ? next as (typeof NEXT)[number] : '/my-listings';

/** web: app/sign-in + SignInForm. The API answers the app with a token, kept in secure storage. */
export default function SignInScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<SignInErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const emailRef = useRef<ComponentRef<typeof TextInput>>(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  // the first field with something wrong in it (with "wrong email or password", the email)
  const focusFirst = (errs: SignInErrors) => (errs.email || errs.both ? emailRef : passwordRef).current?.focus();

  const submit = async () => {
    if (busy) return;
    const errs = {
      ...(email.trim() === '' ? { email: ACCOUNT_MESSAGES.email.required } : {}),
      ...(password === '' ? { password: ACCOUNT_MESSAGES.password.required } : {}),
    };
    setErrors(errs);
    setMessage(null);
    if (Object.keys(errs).length) return focusFirst(errs);
    setBusy(true);
    const res = await api<{ token?: string }>('POST', '/login', { email, password, device_name: DEVICE_NAME });
    if (res.ok) {
      if (res.data.token) await setToken(res.data.token);
      router.replace(safeNext(next));
      return;
    }
    setBusy(false);
    const fromApi = signInErrors(res.errors);
    if (fromApi) {
      setErrors(fromApi);
      focusFirst(fromApi);
    } else setMessage(failureMessage(res));
  };

  return (
    <FormScreen title="تسجيل الدخول" lead="بالبريد الإلكتروني وكلمة المرور اللذين أنشأتِ بهما حسابك." post={false}>
      <Card>
        <Section first>
          <Field label="البريد الإلكتروني" error={errors.email}>
            <Input inputRef={emailRef} ltr value={email} onChangeText={(v) => { setEmail(v); setErrors((x) => ({ ...x, email: undefined, both: false })); }}
              invalid={!!errors.email || !!errors.both} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email"
              returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
          </Field>
          <Field label="كلمة المرور" error={errors.password}
            hint={<Txt size="text-small" leading="leading-snug" color={c.textMuted} style={styles.link} onPress={() => router.push('/forgot-password')} accessibilityRole="link">نسيتِ كلمة المرور؟</Txt>}>
            <Input inputRef={passwordRef} ltr secureTextEntry value={password} onChangeText={(v) => { setPassword(v); setErrors((x) => ({ ...x, password: undefined, both: false })); }}
              invalid={!!errors.password} autoCapitalize="none" autoComplete="current-password" returnKeyType="go" onSubmitEditing={submit} />
          </Field>
        </Section>
        <View style={styles.submit}>
          {message && <ErrorLine large>{message}</ErrorLine>}
          <Button variant="submit" blocked={busy} onPress={submit}>{busy ? 'لحظات…' : 'سجّلي الدخول'}</Button>
          <Txt size="text-small" leading="leading-note" color={c.textMuted} align="center">
            {'ليس لديكِ حساب؟ يُنشأ مع '}
            <Txt size="text-small" leading="leading-note" color={c.textMuted} style={styles.link} onPress={() => router.replace('/new')} accessibilityRole="link">أول إعلان ترسلينه</Txt>
            .
          </Txt>
        </View>
      </Card>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  submit: { gap: s[8] },
  link: { textDecorationLine: 'underline' },
});
