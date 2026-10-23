'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/Button.tsx';
import { Field, FieldError, describedBy, fieldStyles as fs } from '@/components/form/Field.tsx';
import { AccountCard, formStyles } from '@/components/account/AccountShell.tsx';
import { REPORT_REASONS, type ReportReason } from '@princess/shared/moderation.ts';
import { api } from '@/lib/client.ts';
import { failureMessage } from '@/lib/messages.ts';

// ARABIC COPY in this file: DRAFT, NOT YET APPROVED.

const NOTE_MAX = 500;

/**
 * A report on a listing: a reason and, if she wants, a few words. No account needed, and nothing
 * about who sent it is kept.
 */
export function ReportForm({ listingId, back }: { listingId: string; back: string }) {
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!reason) return setError('اختاري سبب البلاغ.');
    if ([...note.trim()].length > NOTE_MAX) return setMessage('الملاحظة أطول من المسموح: ٥٠٠ حرف على الأكثر.');
    setBusy(true);
    const res = await api('POST', `/listings/${listingId}/reports`, { reason, note: note.trim() || null });
    setBusy(false);
    if (res.ok) return setDone(true);
    if (res.error === 'already_reported') return setMessage('وصلنا بلاغك عن هذا الإعلان من قبل.');
    setMessage(failureMessage(res));
  };

  if (done) {
    return (
      <AccountCard>
        <p className={formStyles.lead} role="status">شكرًا. وصلنا بلاغك، ويراجعه فريق برينسيس.</p>
        <Button variant="accent" href={back}>العودة إلى الإعلان</Button>
      </AccountCard>
    );
  }
  return (
    <AccountCard onSubmit={onSubmit}>
      <section className={formStyles.section}>
        <Field id="f-reason" label="سبب البلاغ" error={error}>
          <select id="f-reason" className={fs.input} value={reason}
            onChange={(e) => { setReason(e.target.value as ReportReason); setError(undefined); }} {...describedBy('f-reason', { error })}>
            <option value="">اختاري سببًا</option>
            {(Object.keys(REPORT_REASONS) as ReportReason[]).map((r) => <option key={r} value={r}>{REPORT_REASONS[r]}</option>)}
          </select>
        </Field>
        <Field id="f-note" label="ملاحظة" optional>
          <textarea id="f-note" className={fs.textarea} rows={4} value={note}
            onChange={(e) => setNote(e.target.value)} placeholder="ما الذي يجب أن نعرفه؟" />
        </Field>
      </section>
      <div className={formStyles.submit}>
        {message && <FieldError id="e-form" size="lg" alert>{message}</FieldError>}
        <Button type="submit" variant="submit" aria-disabled={busy}>{busy ? 'لحظات…' : 'أرسلي البلاغ'}</Button>
        <p className={formStyles.note}>لا نحتفظ بأي شيء عن مُرسلة البلاغ.</p>
      </div>
    </AccountCard>
  );
}
