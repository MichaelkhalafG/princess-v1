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
import { SentBanner } from '@/components/PostedBanner.tsx';
import { AccountCard, formStyles } from './AccountShell.tsx';
import styles from './AccountShell.module.css';

// ARABIC COPY in this file: DRAFT, NOT YET APPROVED.

type Mine = Omit<Listing, 'published_at'> & { published_at: string | null; created_at: string; status: ListingStatus; reject_reason: string | null };

/** Right after she sends one: the news, and what happens next. */
const SENT: Record<string, { title: string; body: string }> = {
  unverified: { title: 'وصلنا إعلانك', body: 'أكّدي بريدك الإلكتروني من الرسالة التي أرسلناها إليكِ، ثم نراجع الإعلان قبل أن يظهر على اللوحة.' },
  pending: { title: 'وصلنا إعلانك', body: 'نراجع كل إعلان قبل أن يظهر على اللوحة، وتجدين حالته هنا.' },
};

/** The status pill's colour: waiting (the default), on the board, or refused. */
const STATE_CLASS: Partial<Record<ListingStatus, string>> = {
  published: styles.stateLive,
  rejected: styles.stateRefused,
  removed: styles.stateRefused,
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
  const sentBanner = sent ? SENT[sent] : undefined;
  return (
    <div className={styles.stack}>
      {sentBanner && <SentBanner title={sentBanner.title} body={sentBanner.body} />}

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
          items.map((l) => {
            const live = l.status === 'published';
            return (
              <div key={l.id} className={styles.item}>
                {/* only a listing on the board has a public page, and a date that means "on the board since" */}
                <ListingCard
                  listing={{ ...l, published_at: l.published_at ?? l.created_at }}
                  variant="compact"
                  href={live ? `/listing/${l.id}` : null}
                  showDate={live}
                  photoSrc={l.photo?.url ?? null}
                  now={now}
                />
                <div className={styles.itemSide}>
                  <span className={`${styles.state} ${STATE_CLASS[l.status] ?? ''}`}>{LISTING_STATUSES[l.status]}</span>
                  {reasonLabel(l.reject_reason) && <FieldError id={`e-${l.id}`}>{reasonLabel(l.reject_reason)}</FieldError>}
                  <Button variant="soft" size="compact" onClick={() => withdraw(l.id)}>
                    {confirming === l.id ? 'تأكيد: احذفيه نهائيًا' : 'احذفي الإعلان'}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </AccountCard>

      {/* her account: signing out is the everyday action; deleting it, the quiet one under it */}
      <AccountCard>
        <p className={fs.hint}>الحساب: <bdi dir="ltr">{me.email}</bdi></p>
        <Button variant="soft" onClick={signOut}>سجّلي الخروج</Button>
        <DeleteAccount onDeleted={() => router.push('/')} />
      </AccountCard>
    </div>
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
    if (password === '') {
      setError(ACCOUNT_MESSAGES.password.required);
      return document.getElementById('f-delete-password')?.focus();
    }
    setBusy(true);
    const res = await api('DELETE', '/me', { password });
    setBusy(false);
    if (res.ok) return onDeleted();
    setError(res.errors.password ? ACCOUNT_MESSAGES.password[res.errors.password] ?? ACCOUNT_MESSAGES.password.invalid : failureMessage(res));
    document.getElementById('f-delete-password')?.focus();
  };

  if (!open) {
    return <Button variant="text" onClick={() => setOpen(true)}>احذفي حسابي</Button>;
  }
  return (
    <form onSubmit={onSubmit} noValidate className={formStyles.section}>
      <p className={formStyles.lead}>يُحذف حسابك وكل إعلاناتك وصورها نهائيًا، ولا يمكن استرجاعها.</p>
      <Field id="f-delete-password" label="كلمة المرور، للتأكيد" error={error}>
        <input id="f-delete-password" className={fs.input} type="password" dir="ltr" autoComplete="current-password" value={password}
          onChange={(e) => { setPassword(e.target.value); setError(undefined); }} {...describedBy('f-delete-password', { error })} />
      </Field>
      <div className={formStyles.submit}>
        <Button type="submit" variant="submit" aria-disabled={busy}>{busy ? 'لحظات…' : 'احذفي الحساب نهائيًا'}</Button>
      </div>
    </form>
  );
}
