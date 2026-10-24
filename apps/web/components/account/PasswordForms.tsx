'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/Button.tsx';
import { Field, FieldError, describedBy, fieldStyles as fs } from '@/components/form/Field.tsx';
import { api } from '@/lib/client.ts';
import { ACCOUNT_MESSAGES, failureMessage } from '@/lib/messages.ts';
import { AccountCard, formStyles } from './AccountShell.tsx';

// ARABIC COPY in this file: DRAFT, NOT YET APPROVED.

/** She asks for a link to choose a new password. The answer is the same whether or not the email has an account. */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (email.trim() === '') {
      setError(ACCOUNT_MESSAGES.email.required);
      return document.getElementById('f-email')?.focus();
    }
    setBusy(true);
    const res = await api('POST', '/password/forgot', { email });
    setBusy(false);
    if (res.ok) setSent(true);
    else if (res.errors.email) {
      setError(ACCOUNT_MESSAGES.email[res.errors.email] ?? ACCOUNT_MESSAGES.email.invalid);
      document.getElementById('f-email')?.focus();
    } else setMessage(failureMessage(res));
  };

  if (sent) {
    return (
      <AccountCard>
        <p className={formStyles.lead} role="status">إن كان لهذا البريد حساب، فقد أرسلنا إليه رابطًا لتعيين كلمة مرور جديدة. الرابط صالح لمدة ٦٠ دقيقة.</p>
        <Button variant="soft" href="/sign-in">سجّلي الدخول</Button>
      </AccountCard>
    );
  }
  return (
    <AccountCard onSubmit={onSubmit}>
      <section className={formStyles.section}>
        <Field id="f-email" label="البريد الإلكتروني" error={error}>
          <input id="f-email" className={fs.input} type="email" dir="ltr" autoComplete="email" placeholder="name@example.com" spellCheck={false} value={email}
            onChange={(e) => { setEmail(e.target.value); setError(undefined); }} {...describedBy('f-email', { error })} />
        </Field>
      </section>
      <div className={formStyles.submit}>
        {message && <FieldError id="e-form" size="lg" alert>{message}</FieldError>}
        <Button type="submit" variant="submit" aria-disabled={busy}>{busy ? 'لحظات…' : 'أرسلي الرابط'}</Button>
      </div>
    </AccountCard>
  );
}

/** A new password, from the link in the email. Every existing sign-in ends with the old one. */
export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);

  // a link that cannot work: say so, and lead to the page that sends a new one (no form to retry)
  if (!token || !email || expired) {
    return (
      <AccountCard>
        <p className={formStyles.lead} role={expired ? 'alert' : undefined}>
          {expired
            ? 'انتهت صلاحية هذا الرابط أو استُخدم من قبل. اطلبي رابطًا جديدًا من صفحة «نسيتِ كلمة المرور».'
            : 'هذا الرابط غير مكتمل. اطلبي رابطًا جديدًا من صفحة «نسيتِ كلمة المرور».'}
        </p>
        <Button variant="accent" href="/forgot-password">اطلبي رابطًا جديدًا</Button>
      </AccountCard>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if ([...password].length < 8) {
      setError(ACCOUNT_MESSAGES.password.too_short);
      return document.getElementById('f-password')?.focus();
    }
    setBusy(true);
    const res = await api('POST', '/password/reset', { token, email, password });
    setBusy(false);
    if (res.ok) return setDone(true);
    if (res.errors.password) {
      setError(ACCOUNT_MESSAGES.password[res.errors.password] ?? ACCOUNT_MESSAGES.password.invalid);
      document.getElementById('f-password')?.focus();
    } else if (res.errors.token) setExpired(true);
    else setMessage(failureMessage(res));
  };

  if (done) {
    return (
      <AccountCard>
        <p className={formStyles.lead} role="status">تغيّرت كلمة المرور. سجّلي الدخول بها الآن.</p>
        <Button variant="accent" href="/sign-in">سجّلي الدخول</Button>
      </AccountCard>
    );
  }
  return (
    <AccountCard onSubmit={onSubmit}>
      <section className={formStyles.section}>
        <Field id="f-password" label="كلمة المرور الجديدة" error={error} hint="٨ أحرف على الأقل.">
          <input id="f-password" className={fs.input} type="password" dir="ltr" autoComplete="new-password" value={password}
            onChange={(e) => { setPassword(e.target.value); setError(undefined); }} {...describedBy('f-password', { error, hint: true })} />
        </Field>
      </section>
      <div className={formStyles.submit}>
        {message && <FieldError id="e-form" size="lg" alert>{message}</FieldError>}
        <Button type="submit" variant="submit" aria-disabled={busy}>{busy ? 'لحظات…' : 'احفظي كلمة المرور'}</Button>
      </div>
    </AccountCard>
  );
}
