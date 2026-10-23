import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell.tsx';
import { VerifyEmail } from '@/components/account/VerifyEmail.tsx';

// ARABIC COPY: DRAFT
export const metadata: Metadata = { title: 'تأكيد البريد الإلكتروني — برينسيس' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** /verify-email?id=…&hash=…&expires=…&signature=…: the link from the verification email. */
export default async function VerifyEmailPage({ searchParams }: Props) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : null);
  const [id, hash, expires, signature] = [one(sp.id), one(sp.hash), one(sp.expires), one(sp.signature)];
  return (
    <AccountShell title="تأكيد البريد الإلكتروني">
      <VerifyEmail link={id && hash && expires && signature ? { id, hash, expires, signature } : null} />
    </AccountShell>
  );
}
