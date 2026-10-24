import { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LISTING_STATUSES, reasonLabel } from '@princess/shared/moderation.ts';
import { ACCOUNT_MESSAGES, failureMessage } from '@princess/shared/messages.ts';
import { px } from '@princess/tokens/native.ts';
import { api, getMe, type Me, type Mine } from '@/lib/api';
import { unhideAll, useHidden } from '@/lib/hidden';
import { setToken, useToken } from '@/lib/session';
import { Button } from '@/components/Button';
import { Card, ErrorLine, Field, FormScreen, Input } from '@/components/Form';
import { ListingCard } from '@/components/ListingCard';
import { Banner, BannerLine } from '@/components/Panels';
import { Txt, ltr } from '@/components/Txt';
import { DRAFT } from '@/drafts';
import { c, r, s, sizes } from '@/theme';

/** Right after she sends one: the news, and what happens next (web: MyListings' SENT). */
const SENT: Record<string, { title: string; body: string }> = {
  unverified: { title: 'وصلنا إعلانك', body: 'أكّدي بريدك الإلكتروني من الرسالة التي أرسلناها إليكِ، ثم نراجع الإعلان قبل أن يظهر على اللوحة.' },
  pending: { title: 'وصلنا إعلانك', body: 'نراجع كل إعلان قبل أن يظهر على اللوحة، وتجدين حالته هنا.' },
};

/**
 * Her listings (web: app/my-listings + MyListings): each with where it stands, removing any of them
 * for good, a new verification link, signing out, and deleting her account — the store requires
 * that an account made in the app can be deleted in the app. Plus, on this phone only, undoing the
 * posters she has hidden.
 */
export default function MyListingsScreen() {
  const { sent } = useLocalSearchParams<{ sent?: string }>();
  const { width } = useWindowDimensions();
  const token = useToken();
  const hidden = useHidden();
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
  // again each time she comes back to this screen (after posting, after signing in) …
  useFocusEffect(useCallback(() => { load(); }, [load, token]));
  // … and to the app (the verification link opens in her browser; she comes back verified)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => state === 'active' && load());
    return () => sub.remove();
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
    await setToken(null);
    router.dismissTo('/');
  };

  const hiddenCount = hidden ? hidden.listings.length : 0;
  const hiddenCard = hiddenCount > 0 && (
    <Card>
      <Txt size="text-small" leading="leading-snug" color={c.textMuted}>{DRAFT.hiddenNotice}</Txt>
      <Button variant="soft" onPress={unhideAll}>{DRAFT.unhideAll}</Button>
    </Card>
  );

  const body = (() => {
    if (me === undefined) return <Card><Txt size="text-lead-sm" color={c.textSecondary}>لحظات…</Txt></Card>;
    if (me === null) {
      return (
        <>
          <Card>
            <Txt size="text-lead-sm" color={c.textSecondary}>سجّلي الدخول لتري إعلاناتك.</Txt>
            <Button variant="accent" onPress={() => router.push({ pathname: '/sign-in', params: { next: '/my-listings' } })}>سجّلي الدخول</Button>
          </Card>
          {hiddenCard}
        </>
      );
    }
    const now = new Date();
    const narrow = width < 600;
    return (
      <>
        {sent && SENT[sent] && (
          <Banner title={SENT[sent].title}><BannerLine>{SENT[sent].body}</BannerLine></Banner>
        )}

        {!me.verified && (
          <Card>
            <Txt size="text-lead-sm" color={c.textSecondary}>لم تؤكّدي بريدك الإلكتروني بعد: لن يصلنا أي إعلان منكِ قبل تأكيده. إن لم تؤكّديه خلال ٧ أيام، يُحذف الحساب وإعلاناته.</Txt>
            {linkSent
              ? <Txt size="text-small" leading="leading-snug" color={c.textMuted} accessibilityRole="alert">{`أرسلنا رابطًا جديدًا إلى ${ltr(me.email)}. الرابط صالح لمدة ٢٤ ساعة.`}</Txt>
              : <Button variant="soft" onPress={resend}>أرسلي رابط التأكيد من جديد</Button>}
          </Card>
        )}

        {message && <ErrorLine large>{message}</ErrorLine>}

        <Card>
          {items === null ? (
            <Txt size="text-lead-sm" color={c.textSecondary}>لحظات…</Txt>
          ) : items.length === 0 ? (
            <>
              <Txt size="text-lead-sm" color={c.textSecondary}>لا إعلانات لكِ بعد.</Txt>
              <Button variant="accent" onPress={() => router.push('/new')}>اعرضي خدمتك</Button>
            </>
          ) : (
            items.map((l, i) => {
              const live = l.status === 'published';
              const refused = l.status === 'rejected' || l.status === 'removed';
              return (
                <View key={l.id} style={[styles.item, narrow && styles.itemNarrow, i > 0 && styles.itemRule]}>
                  <View style={narrow ? undefined : styles.itemCard}>
                    {/* only a listing on the board has a public page, and a date that means "on the board since" */}
                    <ListingCard
                      listing={{ ...l, published_at: l.published_at ?? l.created_at }}
                      variant="compact"
                      now={now}
                      showDate={live}
                      onOpen={live ? () => router.push({ pathname: '/listing/[id]', params: { id: l.id } }) : null}
                    />
                  </View>
                  <View style={styles.itemSide}>
                    <View style={[styles.state, live && styles.stateLive, refused && styles.stateRefused]}>
                      <Txt f="heading700" size="text-body-sm" leading="leading-snug" color={live ? c.onAccent : c.ink}>{LISTING_STATUSES[l.status]}</Txt>
                    </View>
                    {reasonLabel(l.reject_reason) && <ErrorLine>{reasonLabel(l.reject_reason)}</ErrorLine>}
                    <Button variant="soft" compact onPress={() => withdraw(l.id)}>{confirming === l.id ? 'تأكيد: احذفيه نهائيًا' : 'احذفي الإعلان'}</Button>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        {/* her account: signing out is the everyday action; deleting it, the quiet one under it */}
        <Card>
          <Txt size="text-small" leading="leading-snug" color={c.textMuted}>{`الحساب: ${ltr(me.email)}`}</Txt>
          <Button variant="soft" onPress={signOut}>سجّلي الخروج</Button>
          <DeleteAccount />
        </Card>

        {hiddenCard}
      </>
    );
  })();

  return <FormScreen title="إعلاناتي" post={false}>{body}</FormScreen>;
}

/** Her whole account, and everything in it, for good. Her password again first. */
function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (password === '') return setError(ACCOUNT_MESSAGES.password.required);
    setBusy(true);
    const res = await api('DELETE', '/me', { password });
    setBusy(false);
    if (res.ok) {
      await setToken(null);
      router.dismissTo('/');
      return;
    }
    setError(res.errors.password ? ACCOUNT_MESSAGES.password[res.errors.password] ?? ACCOUNT_MESSAGES.password.invalid : failureMessage(res));
  };

  if (!open) return <Button variant="text" onPress={() => setOpen(true)}>احذفي حسابي</Button>;
  return (
    <View style={styles.delete}>
      <Txt size="text-lead-sm" color={c.textSecondary}>يُحذف حسابك وكل إعلاناتك وصورها نهائيًا، ولا يمكن استرجاعها.</Txt>
      <Field label="كلمة المرور، للتأكيد" error={error}>
        <Input ltr secureTextEntry value={password} onChangeText={(v) => { setPassword(v); setError(undefined); }} invalid={!!error} autoCapitalize="none" autoComplete="current-password" />
      </Field>
      <Button variant="submit" blocked={busy} onPress={submit}>{busy ? 'لحظات…' : 'احذفي الحساب نهائيًا'}</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: s[15], alignItems: 'flex-start' },
  itemNarrow: { flexDirection: 'column', alignItems: 'stretch', gap: s[11] },
  itemRule: { borderTopWidth: sizes.hairline, borderTopColor: c.tint, paddingTop: s[16] },
  itemCard: { width: px('width-card-compact') },
  itemSide: { gap: s[8], alignItems: 'flex-start' },
  // where it stands: the line she came to this page for, so the strongest one — a pill in the
  // state's colour (waiting amber, on the board teal, refused or removed blush)
  state: { paddingVertical: s[5], paddingHorizontal: s[11], borderRadius: r.pill, backgroundColor: c.tintAmber },
  stateLive: { backgroundColor: c.secondary },
  stateRefused: { backgroundColor: c.tint },
  delete: { gap: s[12] },
});
