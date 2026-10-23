import type { Metadata } from 'next';
import { AccountShell } from '@/components/account/AccountShell.tsx';
import { ForgotPasswordForm } from '@/components/account/PasswordForms.tsx';

// ARABIC COPY: DRAFT
export const metadata: Metadata = { title: 'نسيتِ كلمة المرور؟ — برينسيس' };

export default function ForgotPasswordPage() {
  return (
    <AccountShell title="نسيتِ كلمة المرور؟" lead="اكتبي بريدك الإلكتروني، ونرسل إليه رابطًا لتعيين كلمة مرور جديدة.">
      <ForgotPasswordForm />
    </AccountShell>
  );
}
