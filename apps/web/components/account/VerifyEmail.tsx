'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/Button.tsx';
import { api } from '@/lib/client.ts';
import { TRY_LATER_MESSAGE } from '@/lib/messages.ts';
import { AccountCard, formStyles } from './AccountShell.tsx';

// ARABIC COPY in this file: DRAFT, NOT YET APPROVED.

type Link = { id: string; hash: string; expires: string; signature: string };

/** The link from the verification email: passed to the API as it came, signature and all. */
export function VerifyEmail({ link }: { link: Link | null }) {
  const [state, setState] = useState<'checking' | 'done' | 'expired' | 'invalid' | 'failed'>(link ? 'checking' : 'invalid');

  useEffect(() => {
    if (!link) return;
    const query = new URLSearchParams({ expires: link.expires, signature: link.signature });
    api('GET', `/email/verify/${encodeURIComponent(link.id)}/${encodeURIComponent(link.hash)}?${query}`).then((res) => {
      if (res.ok) setState('done');
      else if (res.error === 'link_expired') setState('expired');
      else if (res.error === 'link_invalid') setState('invalid');
      else setState('failed');
    });
  }, [link]);

  const text = {
    checking: 'لحظات، نتحقق من الرابط…',
    done: 'تأكّد بريدك الإلكتروني. وصلنا إعلانك، ونراجعه قبل أن يظهر على اللوحة. تجدين حالته في صفحة «إعلاناتي».',
    expired: 'انتهت صلاحية هذا الرابط. سجّلي الدخول، ومن صفحة «إعلاناتي» اطلبي رابطًا جديدًا.',
    invalid: 'هذا الرابط غير صالح. انسخيه كاملًا من الرسالة، أو سجّلي الدخول واطلبي رابطًا جديدًا.',
    failed: TRY_LATER_MESSAGE,
  }[state];

  return (
    <AccountCard>
      <p className={formStyles.lead} role="status">{text}</p>
      {state === 'done' && <Button variant="accent" href="/my-listings">إعلاناتي</Button>}
      {(state === 'expired' || state === 'invalid') && <Button variant="accent" href="/sign-in">سجّلي الدخول</Button>}
    </AccountCard>
  );
}
