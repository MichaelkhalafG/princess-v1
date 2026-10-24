import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { failureMessage } from '@princess/shared/messages.ts';
import { REPORT_REASONS, type ReportReason } from '@princess/shared/moderation.ts';
import { api, fetchListing } from '@/lib/api';
import { Button } from '@/components/Button';
import { Card, Choices, ErrorLine, Field, FormScreen, Input, Section } from '@/components/Form';
import { Txt } from '@/components/Txt';
import { c } from '@/theme';

const NOTE_MAX = 500;

/**
 * Reporting a listing (web: app/listing/[id]/report + ReportForm): a reason and, if she wants, a
 * note. No account needed, and nothing about who sent it is kept with the report. The store
 * requires a way to report content from inside the app: this is it.
 */
export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [title, setTitle] = useState<string | null>(null);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState<'sent' | 'already' | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchListing(id).then((res) => setTitle(res.ok ? res.data.title : ''));
  }, [id]);

  const back = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/listing/[id]', params: { id } }));

  const submit = async () => {
    if (busy) return;
    if (!reason) return setError('اختاري سبب البلاغ.');
    if ([...note.trim()].length > NOTE_MAX) return setMessage('الملاحظة أطول من المسموح: ٥٠٠ حرف على الأكثر.');
    setBusy(true);
    const res = await api('POST', `/listings/${id}/reports`, { reason, note: note.trim() || null });
    setBusy(false);
    if (res.ok) return setDone('sent');
    if (res.error === 'already_reported') return setDone('already');
    setMessage(failureMessage(res));
  };

  return (
    <FormScreen title="الإبلاغ عن إعلان" lead={title ? `عن: ${title}` : undefined} fallback={{ pathname: '/listing/[id]', params: { id } }}>
      {done ? (
        <Card>
          <Txt size="text-lead-sm" color={c.textSecondary} accessibilityRole="alert">
            {done === 'sent' ? 'شكرًا. وصلنا بلاغك، ويراجعه فريق برينسيس.' : 'وصلنا بلاغك عن هذا الإعلان من قبل.'}
          </Txt>
          <Button variant="accent" onPress={back}>العودة إلى الإعلان</Button>
        </Card>
      ) : (
        <Card>
          <Section first>
            <Field label="سبب البلاغ" error={error}>
              <Choices
                options={(Object.keys(REPORT_REASONS) as ReportReason[]).map((k) => ({ value: k, label: REPORT_REASONS[k] }))}
                value={reason}
                onChange={(v) => { setReason(v); setError(undefined); }}
                invalid={!!error}
              />
            </Field>
            <Field label="ملاحظة" optional>
              <Input multiline value={note} onChangeText={setNote} placeholder="ما الذي يجب أن نعرفه؟" maxLength={NOTE_MAX * 2} />
            </Field>
          </Section>
          {message && <ErrorLine large>{message}</ErrorLine>}
          <Button variant="submit" blocked={busy} onPress={submit}>{busy ? 'لحظات…' : 'أرسلي البلاغ'}</Button>
          <Txt size="text-small" leading="leading-note" color={c.textMuted} align="center">لا يُحفظ مع البلاغ أي شيء عنكِ.</Txt>
        </Card>
      )}
    </FormScreen>
  );
}
