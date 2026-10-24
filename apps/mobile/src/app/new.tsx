import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { CATEGORIES, COUNTRIES, getCountry, type CategorySlug } from '@princess/shared/constants.ts';
import { megabytesLabel, phonePlaceholder, pricePlaceholder } from '@princess/shared/format.ts';
import { SERVER_MESSAGES } from '@princess/shared/listing.ts';
import {
  CONTACTS_REQUIREMENT, PUBLISH_FAILED_MESSAGE, counter, emptyForm, hasValidContact, submitGate, toPayload, validateForm,
  type FormErrors, type FormValues, type SubmitPhase, type UploadState,
} from '@princess/shared/listing-form.ts';
import { ACCOUNT_MESSAGES, PHOTO_MESSAGES, failureMessage, signInErrors, type SignInErrors } from '@princess/shared/messages.ts';
import { px } from '@princess/tokens/native.ts';
import { DEVICE_NAME, api, getMe, type Me } from '@/lib/api';
import { pickPhoto, type PreparedPhoto } from '@/lib/photo';
import { setToken } from '@/lib/session';
import { UPLOAD_FAILED_MESSAGE, UploadError, uploadPhoto } from '@/lib/upload';
import { Button } from '@/components/Button';
import { CategoryIcon } from '@/components/CategoryIcon';
import { CountrySelector } from '@/components/CountrySelector';
import { Card, ErrorLine, Field, FormScreen, Input, Section } from '@/components/Form';
import { Txt, ltr } from '@/components/Txt';
import { c, r, s, sizes, tones } from '@/theme';

/** The API's codes for the listing's fields, as the form's messages (web: ListingForm's listingErrors). */
function listingErrors(codes: Record<string, string>): { errors: FormErrors; photo: string | null } {
  const errors: FormErrors = {};
  let photo: string | null = null;
  for (const [key, code] of Object.entries(codes)) {
    const messages = (SERVER_MESSAGES as Record<string, Record<string, string>>)[key];
    if (key === 'contact') errors.contacts = SERVER_MESSAGES.contact.contact_required;
    else if (key === 'photo') photo = PHOTO_MESSAGES[code] ?? SERVER_MESSAGES.photo.invalid;
    else if (messages && key in emptyForm('EG')) errors[key as keyof FormErrors] = messages[code] ?? messages.invalid;
  }
  return { errors, photo };
}

type Photo = { state: UploadState; file: PreparedPhoto | null; reason?: string };

/**
 * Posting a listing (web: app/new + ListingForm): who and where, what she offers, an optional
 * photo, how a client reaches her, then her account at the end — she signs up (or in) with the
 * listing. The rules and every message are the web's (@princess/shared/listing-form.ts); the API
 * checks the same rules again.
 */
export default function NewListingScreen() {
  const [values, setValues] = useState<FormValues>(() => emptyForm(COUNTRIES[0].code));
  const [errors, setErrors] = useState<FormErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [photo, setPhoto] = useState<Photo>({ state: 'idle', file: null });
  const [phase, setPhase] = useState<SubmitPhase>(null);
  // a photo that went up but whose listing was then not saved is reused on the next attempt
  const uploaded = useRef<{ uri: string; id: string } | null>(null);
  const abortUpload = useRef<(() => void) | null>(null);
  useEffect(() => () => abortUpload.current?.(), []);

  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [accountMode, setAccountMode] = useState<'new' | 'existing'>('new');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountErrors, setAccountErrors] = useState<SignInErrors>({});
  useEffect(() => {
    getMe().then(setMe);
  }, []);
  const signedIn = Boolean(me);

  const country = getCountry(values.country);
  const contactsOk = hasValidContact(values);
  const gate = submitGate(values, photo.state, phase);

  const set = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => {
      const next = { ...e };
      delete next[field];
      if ((field === 'whatsapp' || field === 'phone' || field === 'social') && String(value).trim()) delete next.contacts;
      return next;
    });
    setFormMessage(null);
  };

  const choosePhoto = async () => {
    setPhoto((p) => ({ ...p, state: 'preparing' }));
    const res = await pickPhoto();
    if (res.kind === 'cancelled') return setPhoto((p) => ({ ...p, state: p.file ? 'chosen' : 'idle' }));
    if (res.kind === 'rejected') return setPhoto({ state: 'rejected', file: null, reason: PHOTO_MESSAGES[res.reason] ?? PHOTO_MESSAGES.invalid });
    setPhoto({ state: 'chosen', file: res.photo });
  };

  const submit = async () => {
    if (gate.blocked && gate.reason !== 'contacts') return;
    const errs = validateForm(values);
    const accErrs: SignInErrors = signedIn ? {} : {
      ...(email.trim() === '' ? { email: ACCOUNT_MESSAGES.email.required } : {}),
      ...(password === '' ? { password: ACCOUNT_MESSAGES.password.required }
        : accountMode === 'new' && [...password].length < 8 ? { password: ACCOUNT_MESSAGES.password.too_short } : {}),
    };
    setAccountErrors(accErrs);
    setErrors(errs);
    if (Object.keys(errs).length > 0 || Object.keys(accErrs).length > 0) return;
    setFormMessage(null);

    // 0. she has an account and signs in with it first
    if (!signedIn && accountMode === 'existing') {
      setPhase('publishing');
      const login = await api<Me & { token?: string }>('POST', '/login', { email, password, device_name: DEVICE_NAME });
      if (!login.ok) {
        setPhase(null);
        const e = signInErrors(login.errors);
        if (e) setAccountErrors(e);
        else setFormMessage(failureMessage(login));
        return;
      }
      if (login.data.token) await setToken(login.data.token);
      setMe(login.data);
      setPhase(null);
    }

    // 1. her photo, if she chose one (and it is not already up from a failed attempt)
    let photoId: string | null = null;
    if (photo.file) {
      if (uploaded.current?.uri === photo.file.uri) {
        photoId = uploaded.current.id;
      } else {
        setPhase({ uploading: 0 });
        const job = uploadPhoto(photo.file, (share) => setPhase({ uploading: Math.round(share * 100) }));
        abortUpload.current = job.abort;
        try {
          photoId = await job.promise;
          uploaded.current = { uri: photo.file.uri, id: photoId };
        } catch (err) {
          setPhase(null);
          const code = err instanceof UploadError ? err.code : 'network';
          setFormMessage(PHOTO_MESSAGES[code] ?? UPLOAD_FAILED_MESSAGE);
          return;
        } finally {
          abortUpload.current = null;
        }
      }
    }

    // 2. the listing itself, with her new account when she has none
    setPhase('publishing');
    const account = signedIn || accountMode === 'existing' ? {} : { email, password, device_name: DEVICE_NAME };
    const res = await api<{ id: string; status: string; token?: string }>('POST', '/listings', { ...toPayload(values, photoId), ...account });
    if (res.ok) {
      if (res.data.token) await setToken(res.data.token);
      // on the board at once: its own page, with the "posted" banner; otherwise her listings
      if (res.data.status === 'published') router.replace({ pathname: '/listing/[id]', params: { id: res.data.id, posted: '1' } });
      // her listings is a tab under the form: close the form down onto it
      else router.dismissTo({ pathname: '/my-listings', params: { sent: res.data.status } });
      return;
    }
    setPhase(null);
    if (res.status === 422) {
      const { errors: fieldErrors, photo: photoMessage } = listingErrors(res.errors);
      if (photoMessage) uploaded.current = null;
      const acc: SignInErrors = {
        ...(res.errors.email ? { email: ACCOUNT_MESSAGES.email[res.errors.email] ?? ACCOUNT_MESSAGES.email.invalid } : {}),
        ...(res.errors.password ? { password: ACCOUNT_MESSAGES.password[res.errors.password] ?? ACCOUNT_MESSAGES.password.invalid } : {}),
      };
      setErrors(fieldErrors);
      setAccountErrors(acc);
      setFormMessage(photoMessage ?? (Object.keys(fieldErrors).length || Object.keys(acc).length ? null : PUBLISH_FAILED_MESSAGE));
      return;
    }
    setFormMessage(failureMessage(res));
  };

  const text = (field: 'name' | 'title' | 'city' | 'district' | 'price') => ({
    value: values[field],
    onChangeText: (v: string) => set(field, v),
    invalid: !!errors[field],
  });

  const prefixed = (field: 'whatsapp' | 'phone' | 'social', prefix: string, label: string, placeholder: string) => (
    <Field label={label} error={errors[field]}>
      <View style={[styles.group, errors[field] && styles.groupInvalid]}>
        <View style={styles.prefix}>
          <Txt f="body600" size={field === 'social' ? 'text-body' : 'text-control'} leading="leading-none" color={c.textMuted}>{prefix}</Txt>
        </View>
        <Input
          ltr
          value={values[field]}
          onChangeText={(v) => set(field, field === 'social' ? v.replace(/^\s*@+/, '') : v)}
          placeholder={placeholder}
          keyboardType={field === 'social' ? 'default' : 'phone-pad'}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.groupInput}
        />
      </View>
    </Field>
  );

  return (
    <FormScreen title="اعرضي خدمتك" lead="دقيقتان، ونراجع إعلانك قبل أن يظهر لكل سيدة في بلدك. بلا عمولة." bar="close" amber>
      <Card>
        {/* 1. who and where */}
        <Section title="عنكِ ومكانك" first>
          <Field label="الاسم" counter={counter('name', values.name)} error={errors.name}>
            <Input {...text('name')} placeholder="كما تحبين أن تناديكِ العميلة" autoComplete="name" />
          </Field>
          <Field label="الدولة">
            <CountrySelector inset value={values.country} onChange={(k) => set('country', k)} />
          </Field>
          <Field label="المدينة" error={errors.city}>
            <Input {...text('city')} placeholder={`مثال: ${country.cityExample}`} />
          </Field>
          <Field label="الحي" optional>
            <Input {...text('district')} placeholder={`مثال: ${country.districtExample}`} />
          </Field>
        </Section>

        {/* 2. what she offers */}
        <Section title="خدمتك أو منتجك">
          <Field label="التصنيف" error={errors.category}>
            <View accessibilityRole="radiogroup" style={[styles.tiles, errors.category && styles.tilesInvalid]}>
              {CATEGORIES.map((k) => {
                const on = values.category === k.slug;
                return (
                  <Pressable key={k.slug} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => set('category', k.slug as CategorySlug)} style={[styles.tile, on && styles.tileOn]}>
                    <CategoryIcon path={k.icon} color={on ? c.onInk : tones[k.tone].ink} size={sizes.iconTile} />
                    <Txt f="body600" size="text-control" leading="leading-card-title" color={on ? c.onInk : c.ink} numberOfLines={1}>{k.label}</Txt>
                  </Pressable>
                );
              })}
            </View>
          </Field>
          <Field label="عنوان الخدمة أو المنتج" counter={counter('title', values.title)} error={errors.title}>
            <Input {...text('title')} placeholder="مثال: مانيكير جل في منزلك" />
          </Field>
          <Field label="الوصف" counter={counter('description', values.description)} error={errors.description}>
            <Input multiline value={values.description} onChangeText={(v) => set('description', v)} invalid={!!errors.description}
              placeholder="ماذا تقدمين بالضبط؟ كيف تعملين، وما الذي يميزك، وما الذي تحتاج العميلة معرفته قبل أن تتواصل معك." />
          </Field>
          <Field label="السعر" counter={counter('price', values.price)} hint="اكتبيه كما تريدين أن يظهر، أو اتركيه فارغًا ويُتفق عليه مباشرة." error={errors.price}>
            <Input {...text('price')} placeholder={pricePlaceholder(values.country)} />
          </Field>

          {/* the photo: optional, chosen and prepared on her phone, sent with the listing */}
          <Field label="صورة من عملك" optional>
            {photo.file && photo.state === 'chosen' ? (
              <View style={[styles.photoRow]}>
                <Image source={{ uri: photo.file.uri }} style={styles.thumb} accessibilityLabel="معاينة الصورة المختارة" />
                <View style={styles.photoMeta}>
                  <Txt f="body600" size="text-small" leading="leading-snug" color={c.secondary}>{`جاهزة للنشر، ${megabytesLabel(photo.file.bytes)}`}</Txt>
                  <View style={styles.photoActions}>
                    <Button variant="surface" onPress={choosePhoto}>تغيير</Button>
                    <Button variant="surface" onPress={() => { setPhoto({ state: 'idle', file: null }); uploaded.current = null; }} accessibilityLabel="إزالة الصورة">إزالة</Button>
                  </View>
                </View>
              </View>
            ) : (
              <Pressable onPress={choosePhoto} accessibilityRole="button" style={[styles.dropzone, photo.state === 'rejected' && styles.dropzoneRejected]}>
                {photo.state === 'preparing' ? (
                  <Txt size="text-small" color={c.textMuted}>جارٍ تجهيز الصورة…</Txt>
                ) : (
                  <>
                    <Txt f="heading700" leading="leading-snug">{photo.state === 'rejected' ? 'اختاري صورة أخرى' : 'اختاري صورة لعملك'}</Txt>
                    <Txt size="text-small" leading="leading-snug" color={c.textMuted}>
                      {photo.state === 'rejected' ? 'JPEG أو PNG أو WebP.' : 'صورة واحدة لنتيجة أو منتج، لا لوجهك. JPEG أو PNG أو WebP.'}
                    </Txt>
                  </>
                )}
              </Pressable>
            )}
            {photo.state === 'rejected' && photo.reason && <ErrorLine>{photo.reason}</ErrorLine>}
          </Field>
        </Section>

        {/* 3. how a client reaches her */}
        <View style={[styles.contacts, errors.contacts && styles.contactsInvalid]}>
          <View style={styles.contactsTitles}>
            <View style={styles.contactsHead}>
              <Txt f="heading700" size="text-body" leading="leading-snug" accessibilityRole="header" style={styles.contactsTitle}>كيف تتواصل معك العميلة؟</Txt>
              <View style={[styles.status, contactsOk && styles.statusOk]}>
                <Txt f="body600" size="text-caption" leading="leading-snug" color={contactsOk ? c.onAccent : c.ink}>{contactsOk ? 'أضفتِ طريقة تواصل' : 'طريقة تواصل واحدة على الأقل مطلوبة'}</Txt>
              </View>
            </View>
            <Txt f="body600" size="text-small" leading="leading-snug">{CONTACTS_REQUIREMENT}</Txt>
            <Txt size="text-small" leading="leading-snug" color={c.textMuted}>تظهر على إعلانك كما تكتبينها.</Txt>
          </View>
          {errors.contacts && <ErrorLine large>{errors.contacts}</ErrorLine>}
          {prefixed('whatsapp', country.dialCode, 'واتساب', phonePlaceholder(values.country))}
          {prefixed('phone', country.dialCode, 'هاتف', phonePlaceholder(values.country))}
          {prefixed('social', '@', 'إنستغرام', 'اسم الحساب فقط، بلا رابط')}
        </View>

        {/* 4. her account, at the end. ARABIC COPY (web): DRAFT */}
        {me === undefined ? null : signedIn ? (
          <Section title="حسابك">
            <Txt size="text-small" leading="leading-snug" color={c.textMuted}>{`يُرسل الإعلان من حسابك ${ltr(me?.email ?? '')}.`}</Txt>
          </Section>
        ) : (
          <Section
            title={accountMode === 'new' ? 'أنشئي حسابك' : 'سجّلي الدخول'}
            aside={
              <Button variant="text" onPress={() => { setAccountMode((m) => (m === 'new' ? 'existing' : 'new')); setAccountErrors({}); }}>
                {accountMode === 'new' ? 'لديكِ حساب؟ سجّلي الدخول' : 'ليس لديكِ حساب؟ أنشئي حسابًا'}
              </Button>
            }
          >
            <Txt size="text-small" leading="leading-snug" color={c.textMuted}>
              {accountMode === 'new'
                ? 'بالبريد الإلكتروني وكلمة مرور، لتتابعي إعلاناتك وتحذفيها متى شئتِ. ستصلكِ رسالة لتأكيد بريدك، ثم يصلنا إعلانك للمراجعة. لا يظهر بريدك لأحد.'
                : 'سجّلي الدخول بحسابك، ويُرسل الإعلان منه.'}
            </Txt>
            <Field label="البريد الإلكتروني" error={accountErrors.email}>
              <Input ltr value={email} onChangeText={(v) => { setEmail(v); setAccountErrors((a) => ({ ...a, email: undefined, both: false })); }}
                invalid={!!accountErrors.email || !!accountErrors.both} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
            </Field>
            <Field label="كلمة المرور" error={accountErrors.password}
              hint={accountMode === 'new' ? '٨ أحرف على الأقل.' : (
                <Txt size="text-small" leading="leading-snug" color={c.textMuted} style={styles.link} onPress={() => router.push('/forgot-password')} accessibilityRole="link">نسيتِ كلمة المرور؟</Txt>
              )}>
              <Input ltr secureTextEntry value={password} onChangeText={(v) => { setPassword(v); setAccountErrors((a) => ({ ...a, password: undefined, both: false })); }}
                invalid={!!accountErrors.password} autoCapitalize="none" autoComplete={accountMode === 'new' ? 'new-password' : 'current-password'} />
            </Field>
          </Section>
        )}

        <View style={styles.submit}>
          {formMessage && <ErrorLine large>{formMessage}</ErrorLine>}
          <Button variant="submit" blocked={gate.blocked} onPress={submit}>{gate.label}</Button>
          <Txt size="text-small" leading="leading-note" color={c.textMuted} align="center">بإرسالك الإعلان توافقين على أن برينسيس لوحة إعلانات فقط، والاتفاق يتم بينك وبين العميلة مباشرة. نراجع كل إعلان قبل أن يظهر على اللوحة.</Txt>
        </View>
      </Card>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  // two to a row, like the web's grid at phone width: an odd last tile stays a half, at the start
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: s[5], padding: s[1], borderRadius: r.field, borderWidth: sizes.borderField, borderColor: 'transparent' },
  tilesInvalid: { borderColor: c.accent },
  tile: { width: '48.5%', minHeight: sizes.tile, alignItems: 'center', justifyContent: 'center', gap: s[3], padding: s[5], borderRadius: r.field, backgroundColor: c.canvas },
  tileOn: { backgroundColor: c.ink },
  photoRow: { flexDirection: 'row', gap: s[11], padding: s[8], backgroundColor: c.canvas, borderRadius: r.media, borderTopStartRadius: px('radius-media-shoulder'), alignItems: 'center' },
  thumb: { width: px('size-thumb'), height: px('size-thumb'), borderRadius: px('radius-thumb'), borderTopStartRadius: px('radius-thumb-shoulder'), backgroundColor: c.tint },
  photoMeta: { flex: 1, gap: s[7] },
  photoActions: { flexDirection: 'row', gap: s[5], flexWrap: 'wrap' },
  dropzone: {
    backgroundColor: c.canvas,
    borderRadius: r.media,
    borderTopStartRadius: px('radius-media-shoulder'),
    borderWidth: sizes.borderField,
    borderStyle: 'dashed',
    borderColor: c.dropzoneBorder,
    paddingTop: px('space-dropzone-pad-top'),
    paddingHorizontal: s[15],
    paddingBottom: s[14],
    gap: s[3],
  },
  dropzoneRejected: { borderStyle: 'solid', borderColor: c.accent },
  contacts: { backgroundColor: c.canvas, borderRadius: r.section, paddingTop: s[12], paddingHorizontal: s[11], paddingBottom: s[11], gap: s[10], borderWidth: sizes.borderField, borderColor: 'transparent' },
  contactsInvalid: { borderColor: c.accent },
  contactsTitles: { gap: px('space-hairline-gap') },
  contactsHead: { gap: s[3], alignItems: 'flex-start' },
  contactsTitle: { flexShrink: 1 },
  status: { paddingVertical: s[3], paddingHorizontal: s[8], borderRadius: r.pill, backgroundColor: c.surface },
  statusOk: { backgroundColor: c.secondary },
  group: { flexDirection: 'row', direction: 'ltr', backgroundColor: c.surface, borderRadius: r.field, borderWidth: sizes.borderField, borderColor: c.surface, overflow: 'hidden' },
  groupInvalid: { borderColor: c.accent },
  prefix: { justifyContent: 'center', paddingHorizontal: s[10], backgroundColor: c.tintSoft },
  groupInput: { flex: 1, backgroundColor: 'transparent', borderWidth: 0, borderRadius: 0 },
  link: { textDecorationLine: 'underline' },
  submit: { gap: s[7], paddingTop: s[2] },
});
