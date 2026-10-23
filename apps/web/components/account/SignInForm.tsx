'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button.tsx';
import { Field, FieldError, describedBy, fieldStyles as fs } from '@/components/form/Field.tsx';
import { api } from '@/lib/client.ts';
import { ACCOUNT_MESSAGES, failureMessage } from '@/lib/messages.ts';
import { AccountCard, formStyles } from './AccountShell.tsx';

// ARABIC COPY in this file: DRAFT, NOT YET APPROVED.

/** Only her own pages are a place to go back to after signing in; anything else is her listings. */
function safeNext(next: string | undefined): string {
  return next && /^\/[a-z-]/.test(next) && !next.startsWith('//') ? next : '/my-listings';
}

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errs = {
      ...(email.trim() === '' ? { email: ACCOUNT_MESSAGES.email.required } : {}),
      ...(password === '' ? { password: ACCOUNT_MESSAGES.password.required } : {}),
    };
    setErrors(errs);
    setMessage(null);
    if (Object.keys(errs).length) return;
    setBusy(true);
    const res = await api('POST', '/login', { email, password });
    if (res.ok) {
      router.push(safeNext(next));
      return;
    }
    setBusy(false);
    if (res.errors.email) setErrors({ email: ACCOUNT_MESSAGES.email[res.errors.email] ?? ACCOUNT_MESSAGES.email.wrong_credentials });
    else setMessage(failureMessage(res));
  };

  return (
    <AccountCard onSubmit={onSubmit}>
      <section className={formStyles.section}>
        <Field id="f-email" label="البريد الإلكتروني" error={errors.email}>
          <input id="f-email" className={fs.input} type="email" dir="ltr" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} {...describedBy('f-email', { error: errors.email })} />
        </Field>
        <Field id="f-password" label="كلمة المرور" error={errors.password}>
          <input id="f-password" className={fs.input} type="password" dir="ltr" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} {...describedBy('f-password', { error: errors.password })} />
        </Field>
        <a href="/forgot-password" className={fs.hint}>نسيتِ كلمة المرور؟</a>
      </section>
      <div className={formStyles.submit}>
        {message && <FieldError id="e-form" size="lg" alert>{message}</FieldError>}
        <Button type="submit" variant="submit" aria-disabled={busy}>{busy ? 'لحظات…' : 'سجّلي الدخول'}</Button>
        <p className={formStyles.note}>ليس لديكِ حساب؟ يُنشأ مع أول إعلان ترسلينه.</p>
      </div>
    </AccountCard>
  );
}
