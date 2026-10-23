import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell.tsx';
import { ResetPasswordForm } from '@/components/account/PasswordForms.tsx';

// ARABIC COPY: DRAFT
export const metadata: Metadata = { title: 'كلمة مرور جديدة — برينسيس' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** /reset-password?token=…&email=…: the link from the reset email. */
export default async function ResetPasswordPage({ searchParams }: Props) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '');
  return (
    <AccountShell title="كلمة مرور جديدة">
      <ResetPasswordForm token={one(sp.token)} email={one(sp.email)} />
    </AccountShell>
  );
}
