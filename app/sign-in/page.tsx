import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell.tsx';
import { SignInForm } from '@/components/account/SignInForm.tsx';

// ARABIC COPY: DRAFT
export const metadata: Metadata = { title: 'تسجيل الدخول — برينسيس' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SignInPage({ searchParams }: Props) {
  const next = (await searchParams).next;
  return (
    <AccountShell title="تسجيل الدخول" lead="بالبريد الإلكتروني وكلمة المرور اللذين أنشأتِ بهما حسابك.">
      <SignInForm next={typeof next === 'string' ? next : undefined} />
    </AccountShell>
  );
}
