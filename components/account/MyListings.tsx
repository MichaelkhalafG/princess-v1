'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button.tsx';
import { ListingCard } from '@/components/ListingCard.tsx';
import { Field, FieldError, describedBy, fieldStyles as fs } from '@/components/form/Field.tsx';
import type { Listing } from '@princess/shared/listing.ts';
import { LISTING_STATUSES, reasonLabel, type ListingStatus } from '@princess/shared/moderation.ts';
import { api, getMe, type Me } from '@/lib/client.ts';
import { ACCOUNT_MESSAGES, failureMessage } from '@/lib/messages.ts';
import rowStyles from '@/app/listing/[id]/page.module.css';
import { AccountCard, formStyles } from './AccountShell.tsx';

// ARABIC COPY in this file: DRAFT, NOT YET APPROVED.

type Mine = Omit<Listing, 'published_at'> & { published_at: string | null; created_at: string; status: ListingStatus; reject_reason: string | null };

/** Right after she sends one: what happens next, in one line. */
const SENT: Record<string, string> = {
  unverified: 'وصلنا إعلانك. أكّدي بريدك الإلكتروني من الرسالة التي أرسلناها إليكِ، ثم نراجع الإعلان قبل أن يظهر على اللوحة.',
  pending: 'وصلنا إعلانك. نراجع كل إعلان قبل أن يظهر على اللوحة، وتجدين حالته هنا.',
};

/**
 * Her listings, newest first, each with where it is (and why, when a moderator refused or removed
 * it). She removes any of them for good, asks for a new verification link, signs out, or deletes
 * her account. Nothing here is shown to anyone else.
 */
export function MyListings({ sent }: { sent?: string }) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [items, setItems] = useState<Mine[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState(false);

  const load = useCallback(async () => {
    const who = await getMe();
    setMe(who);
    if (!who) return;
    const res = await api<{ items: Mine[] }>('GET', '/me/listings');
    if (res.ok) setItems(res.data.items);
    else setMessage(failureMessage(res));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const withdraw = async (id: string) => {
    if (confirming !== id) return setConfirming(id);
    setConfirming(null);
    const res = await api('DELETE', `/me/listings/${id}`);
    if (res.ok) setItems((list) => list?.filter((l) => l.id !== id) ?? null);
    else setMessage(failureMessage(res));
  };

  const resend = async () => {
    const res = await api('POST', '/email/resend');
    if (res.ok) setLinkSent(true);
    else setMessage(failureMessage(res));
  };

  const signOut = async () => {
    await api('POST', '/logout');
    router.push('/');
  };

  if (me === undefined) return <AccountCard><p className={formStyles.lead} role="status">لحظات…</p></AccountCard>;
  if (me === null) {
    return (
      <AccountCard>
        <p className={formStyles.lead}>سجّلي الدخول لتري إعلاناتك.</p>
        <Button variant="accent" href="/sign-in?next=/my-listings">سجّلي الدخول</Button>
      </AccountCard>
    );
  }

  const now = new Date();
  return (
    <>
      {sent && SENT[sent] && <AccountCard><p className={formStyles.lead} role="status">{SENT[sent]}</p></AccountCard>}

      {!me.verified && (
        <AccountCard>
          <p className={formStyles.lead}>لم تؤكّدي بريدك الإلكتروني بعد: لن يصلنا أي إعلان منكِ قبل تأكيده. إن لم تؤكّديه خلال ٧ أيام، يُحذف الحساب وإعلاناته.</p>
          {linkSent
            ? <p className={fs.hint} role="status">أرسلنا رابطًا جديدًا إلى <bdi dir="ltr">{me.email}</bdi>. الرابط صالح لمدة ٢٤ ساعة.</p>
            : <Button variant="soft" onClick={resend}>أرسلي رابط التأكيد من جديد</Button>}
        </AccountCard>
      )}

      {message && <FieldError id="e-page" size="lg" alert>{message}</FieldError>}

      <AccountCard>
        {items === null ? (
          <p className={formStyles.lead} role="status">لحظات…</p>
        ) : items.length === 0 ? (
          <>
            <p className={formStyles.lead}>لا إعلانات لكِ بعد.</p>
            <Button variant="accent" href="/new">اعرضي خدمتك</Button>
          </>
        ) : (
          <div className={rowStyles.row}>
            {items.map((l) => (
              <div key={l.id} className={rowStyles.rowItem}>
                {/* card, where it is, and the button, stacked (the form field's column) */}
                <div className={fs.field}>
                <ListingCard
                  listing={{ ...l, published_at: l.published_at ?? l.created_at }}
                  variant="compact"
                  href={l.status === 'published' ? `/listing/${l.id}` : '/my-listings'}
                  photoSrc={l.photo?.url ?? null}
                  now={now}
                />
                <p className={fs.hint}>{LISTING_STATUSES[l.status]}</p>
                {reasonLabel(l.reject_reason) && <FieldError id={`e-${l.id}`}>{reasonLabel(l.reject_reason)}</FieldError>}
                <Button variant="soft" size="compact" onClick={() => withdraw(l.id)}>
                  {confirming === l.id ? 'تأكيد: احذفيه نهائيًا' : 'احذفي الإعلان'}
                </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AccountCard>

      <AccountCard>
        <p className={fs.hint}>الحساب: <bdi dir="ltr">{me.email}</bdi></p>
        <Button variant="soft" onClick={signOut}>سجّلي الخروج</Button>
      </AccountCard>

      <DeleteAccount onDeleted={() => router.push('/')} />
    </>
  );
}

/** Her whole account, and everything in it, for good. Her password again first. */
function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (password === '') return setError(ACCOUNT_MESSAGES.password.required);
    setBusy(true);
    const res = await api('DELETE', '/me', { password });
    setBusy(false);
    if (res.ok) return onDeleted();
    setError(res.errors.password ? ACCOUNT_MESSAGES.password[res.errors.password] ?? ACCOUNT_MESSAGES.password.invalid : failureMessage(res));
  };

  if (!open) {
    return <AccountCard><Button variant="soft" onClick={() => setOpen(true)}>احذفي حسابي</Button></AccountCard>;
  }
  return (
    <AccountCard onSubmit={onSubmit}>
      <p className={formStyles.lead}>يُحذف حسابك وكل إعلاناتك وصورها نهائيًا، ولا يمكن استرجاعها.</p>
      <Field id="f-delete-password" label="كلمة المرور، للتأكيد" error={error}>
        <input id="f-delete-password" className={fs.input} type="password" dir="ltr" autoComplete="current-password" value={password}
          onChange={(e) => { setPassword(e.target.value); setError(undefined); }} {...describedBy('f-delete-password', { error })} />
      </Field>
      <div className={formStyles.submit}>
        <Button type="submit" variant="submit" aria-disabled={busy}>{busy ? 'لحظات…' : 'احذفي الحساب نهائيًا'}</Button>
      </div>
    </AccountCard>
  );
}
