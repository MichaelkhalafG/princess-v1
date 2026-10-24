'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { readBoardContext, withBoardContext } from '@princess/shared/board-url.ts';
import { CATEGORIES, getCountry, type CategorySlug, type CountryCode } from '@princess/shared/constants.ts';
import { SERVER_MESSAGES } from '@princess/shared/listing.ts';
import { phonePlaceholder, pricePlaceholder } from '@princess/shared/format.ts';
import { nextRadioIndex, radioTabIndex } from '@/lib/radio.ts';
import { UPLOAD_FAILED_MESSAGE, UploadError, uploadPhoto } from '@/lib/upload.ts';
import { api, getMe, type Me } from '@/lib/client.ts';
import { ACCOUNT_MESSAGES, PHOTO_MESSAGES, failureMessage, signInErrors, type SignInErrors } from '@/lib/messages.ts';
import {
  CONTACTS_REQUIREMENT, PUBLISH_FAILED_MESSAGE, counter, emptyForm, hasValidContact, submitGate, toPayload, validateForm,
  type FormErrors, type FormField, type FormValues, type SubmitPhase, type UploadState,
} from '@princess/shared/listing-form.ts';
import { Button } from '../Button.tsx';
import { CategoryChip } from '../CategoryChip.tsx';
import { CountrySelector } from '../CountrySelector.tsx';
import { Field, FieldError, credentialsDescribedBy, describedBy, fieldStyles as fs } from './Field.tsx';
import { PhotoPicker } from './PhotoPicker.tsx';
import styles from './ListingForm.module.css';

/** Where focus goes for each field's error, in the order the fields appear. */
const FOCUS_ORDER: [FormField, string][] = [
  ['name', '#f-name'], ['city', '#f-city'], ['category', '#g-category [role="radio"]'], ['title', '#f-title'],
  ['description', '#f-description'], ['price', '#f-price'], ['whatsapp', '#f-whatsapp'], ['phone', '#f-phone'],
  ['social', '#f-social'], ['contacts', '#f-whatsapp'],
];

type AccountErrors = SignInErrors;

/** The API's codes for the listing's fields, as the form's messages. */
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

export function ListingForm({ initialCountry, contextQuery = '' }: { initialCountry: CountryCode; contextQuery?: string }) {
  const [values, setValues] = useState<FormValues>(() => emptyForm(initialCountry));
  const [errors, setErrors] = useState<FormErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ state: UploadState; file: File | null }>({ state: 'idle', file: null });
  const [phase, setPhase] = useState<SubmitPhase>(null);
  // The photo goes up only when she publishes. If it went up but the listing was then not
  // saved, the next attempt reuses it rather than uploading (and orphaning) a second copy.
  const uploaded = useRef<{ file: File; id: string } | null>(null);
  const abortUpload = useRef<(() => void) | null>(null);
  useEffect(() => () => abortUpload.current?.(), []);
  const router = useRouter();

  // Her account: signed in already, or she signs up (or in) at the end of the form.
  // undefined while it is being asked.
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [accountMode, setAccountMode] = useState<'new' | 'existing'>('new');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountErrors, setAccountErrors] = useState<AccountErrors>({});
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

  const focusFirst = (errs: FormErrors) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onlyContacts = Object.keys(errs).length === 1 && errs.contacts;
    const target = onlyContacts
      ? document.getElementById('contacts')
      : FOCUS_ORDER.map(([f, sel]) => (errs[f] ? document.querySelector<HTMLElement>(sel) : null)).find(Boolean) ?? null;
    const focus = onlyContacts ? document.getElementById('f-whatsapp') : target;
    if (!target) return;
    // bring the whole field — its label too — into view below the sticky header, which
    // used to cover a field near the top of the page (the name)
    const block = target.closest<HTMLElement>(`.${fs.field}, fieldset`) ?? target;
    const header = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
    window.scrollTo({ top: block.getBoundingClientRect().top + window.scrollY - header - 16, behavior: reduced ? 'auto' : 'smooth' });
    setTimeout(() => focus?.focus({ preventScroll: true }), reduced ? 0 : 400);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (phase || gate.reason === 'preparing') return;
    // every field is checked BEFORE the photo is sent, so a form with a mistake in it
    // never uploads anything
    const errs = validateForm(values);
    const accErrs: AccountErrors = signedIn ? {} : {
      ...(email.trim() === '' ? { email: ACCOUNT_MESSAGES.email.required } : {}),
      ...(password === '' ? { password: ACCOUNT_MESSAGES.password.required }
        : accountMode === 'new' && [...password].length < 8 ? { password: ACCOUNT_MESSAGES.password.too_short } : {}),
    };
    setAccountErrors(accErrs);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      focusFirst(errs);
      return;
    }
    if (Object.keys(accErrs).length > 0) {
      document.getElementById(accErrs.email ? 'f-email' : 'f-password')?.focus();
      return;
    }
    setFormMessage(null);

    // 0. she has an account and signs in with it first
    if (!signedIn && accountMode === 'existing') {
      setPhase('publishing');
      const login = await api<Me>('POST', '/login', { email, password });
      if (!login.ok) {
        setPhase(null);
        const errs = signInErrors(login.errors);
        if (errs) {
          setAccountErrors(errs);
          document.getElementById(errs.email || errs.both ? 'f-email' : 'f-password')?.focus();
        } else setFormMessage(failureMessage(login));
        return;
      }
      setMe(login.data);
      setPhase(null);
    }

    // 1. her photo, if she chose one (and it is not already up from a failed attempt)
    let photoId: string | null = null;
    if (photo.file) {
      if (uploaded.current?.file === photo.file) {
        photoId = uploaded.current.id;
      } else {
        setPhase({ uploading: 0 });
        const job = uploadPhoto(photo.file, (p) => setPhase({ uploading: p }));
        abortUpload.current = job.abort;
        try {
          photoId = await job.promise;
          uploaded.current = { file: photo.file, id: photoId };
        } catch (err) {
          // nothing she typed is lost: the form and the photo are still here
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
    const account = signedIn || accountMode === 'existing' ? {} : { email, password };
    const res = await api<{ id: string; status: string }>('POST', '/listings', { ...toPayload(values, photoId), ...account });
    if (res.ok) {
      const ctx = readBoardContext(new URLSearchParams(contextQuery));
      // on the board at once: its own page, with the "posted" banner; otherwise her listings page
      router.push(res.data.status === 'published'
        ? withBoardContext(`/listing/${res.data.id}`, { ...ctx, country: ctx.country ?? values.country }, { posted: '1' })
        : `/my-listings?sent=${res.data.status}`);
      return;
    }
    setPhase(null);
    if (res.status === 422) {
      const { errors: fieldErrors, photo: photoMessage } = listingErrors(res.errors);
      if (photoMessage) uploaded.current = null;
      const acc: AccountErrors = {
        ...(res.errors.email ? { email: ACCOUNT_MESSAGES.email[res.errors.email] ?? ACCOUNT_MESSAGES.email.invalid } : {}),
        ...(res.errors.password ? { password: ACCOUNT_MESSAGES.password[res.errors.password] ?? ACCOUNT_MESSAGES.password.invalid } : {}),
      };
      setErrors(fieldErrors);
      setAccountErrors(acc);
      setFormMessage(photoMessage ?? (Object.keys(fieldErrors).length || Object.keys(acc).length ? null : PUBLISH_FAILED_MESSAGE));
      if (Object.keys(fieldErrors).length) focusFirst(fieldErrors);
      else if (acc.email || acc.password) document.getElementById(acc.email ? 'f-email' : 'f-password')?.focus();
      return;
    }
    setFormMessage(failureMessage(res));
  };

  // the category radios: one Tab stop, the arrows move the choice (lib/radio.ts)
  const checkedCategory = CATEGORIES.findIndex((c) => c.slug === values.category);
  const onCategoryKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const radios = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')];
    const next = nextRadioIndex(e.key, radios.indexOf(document.activeElement as HTMLElement), radios.length, getComputedStyle(e.currentTarget).direction === 'rtl');
    if (next === null) return;
    e.preventDefault();
    set('category', CATEGORIES[next].slug as CategorySlug);
    radios[next].focus();
  };

  const text = (field: 'name' | 'title' | 'city' | 'district' | 'price', extra: Record<string, unknown> = {}) => ({
    id: `f-${field}`,
    className: fs.input,
    value: values[field],
    onChange: (e: { target: { value: string } }) => set(field, e.target.value),
    ...describedBy(`f-${field}`, { error: errors[field], hint: field === 'price' }),
    ...extra,
  });

  const prefixed = (field: 'whatsapp' | 'phone' | 'social', prefix: string, label: string, extra: Record<string, unknown>) => (
    <div className={fs.field}>
      <label htmlFor={`f-${field}`} className={fs.label}>{label}</label>
      <div className={`${fs.group} ${errors[field] ? fs.invalid : ''}`}>
        <span className={`${fs.prefix} ${field === 'social' ? fs.prefixSymbol : ''}`} aria-hidden="true">{prefix}</span>
        <input
          id={`f-${field}`}
          className={fs.groupInput}
          value={values[field]}
          // the @ is already printed before the field: a typed or pasted one is dropped
          onChange={(e) => set(field, field === 'social' ? e.target.value.replace(/^\s*@+/, '') : e.target.value)}
          {...describedBy(`f-${field}`, { error: errors[field] })}
          {...extra}
        />
      </div>
      {errors[field] && <FieldError id={`e-f-${field}`}>{errors[field]}</FieldError>}
    </div>
  );

  return (
    <>
      <div className={styles.intro}>
        <h1 className={styles.title}>اعرضي خدمتك</h1>
        {/* ARABIC COPY: DRAFT */}
        <p className={styles.lead}>دقيقتان، ونراجع إعلانك قبل أن يظهر لكل سيدة في بلدك. بلا عمولة.</p>
      </div>

      <form className={styles.card} onSubmit={onSubmit} noValidate>
        {/* 1. who and where — short fields side by side */}
        <section className={styles.section} aria-labelledby="s-you">
          <h2 id="s-you" className={styles.sectionTitle}>عنكِ ومكانك</h2>
          <div className={styles.two}>
            <Field id="f-name" label="الاسم" counter={counter('name', values.name)} error={errors.name}>
              <input {...text('name', { autoComplete: 'name', placeholder: 'كما تحبين أن تناديكِ العميلة' })} />
            </Field>
            <fieldset className={styles.fieldset}>
              <legend id="l-country" className={`${fs.label} ${styles.legend}`}>الدولة</legend>
              <CountrySelector size="large" surface="inset" labelledBy="l-country" value={values.country} onChange={(k) => set('country', k)} />
            </fieldset>
          </div>
          <div className={styles.two}>
            <Field id="f-city" label="المدينة" error={errors.city}>
              <input {...text('city', { placeholder: `مثال: ${country.cityExample}` })} />
            </Field>
            <Field id="f-district" label="الحي" optional>
              <input {...text('district', { placeholder: `مثال: ${country.districtExample}` })} />
            </Field>
          </div>
        </section>

        {/* 2. what she offers */}
        <section className={styles.section} aria-labelledby="s-offer">
          <h2 id="s-offer" className={styles.sectionTitle}>خدمتك أو منتجك</h2>

        <fieldset className={styles.fieldset}>
          <legend className={`${fs.label} ${styles.legend}`}>التصنيف</legend>
          <div
            id="g-category"
            role="radiogroup"
            onKeyDown={onCategoryKey}
            aria-label="التصنيف"
            className={`${styles.chips} ${errors.category ? styles.chipsInvalid : ''}`}
            {...(errors.category ? { 'aria-describedby': 'e-category' } : {})}
          >
            {CATEGORIES.map((c, i) => (
              <CategoryChip
                tabIndex={radioTabIndex(i, checkedCategory)}
                key={c.slug}
                category={c.slug}
                variant="inset"
                role="radio"
                label={c.label}
                icon={c.icon}
                selected={values.category === c.slug}
                onSelect={() => set('category', c.slug as CategorySlug)}
              />
            ))}
          </div>
          {errors.category && <FieldError id="e-category">{errors.category}</FieldError>}
        </fieldset>

        <Field id="f-title" label="عنوان الخدمة أو المنتج" counter={counter('title', values.title)} error={errors.title}>
          <input {...text('title', { placeholder: 'مثال: مانيكير جل في منزلك' })} />
        </Field>

        <Field id="f-description" label="الوصف" counter={counter('description', values.description)} error={errors.description}>
          <textarea
            id="f-description"
            className={fs.textarea}
            rows={5}
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="ماذا تقدمين بالضبط؟ كيف تعملين، وما الذي يميزك، وما الذي تحتاج العميلة معرفته قبل أن تتواصل معك."
            {...describedBy('f-description', { error: errors.description })}
          />
        </Field>

        <Field
          id="f-price"
          label="السعر"
          counter={counter('price', values.price)}
          hint="اكتبيه كما تريدين أن يظهر، أو اتركيه فارغًا ويُتفق عليه مباشرة."
          error={errors.price}
        >
          <input {...text('price', { placeholder: pricePlaceholder(values.country) })} />
        </Field>

        <PhotoPicker onChange={(state, file) => setPhoto({ state, file })} />
        </section>

        <fieldset id="contacts" className={`${styles.contacts} ${errors.contacts ? styles.contactsInvalid : ''}`} aria-describedby="contacts-rule">
          <legend className="visually-hidden">طرق التواصل</legend>
          <div className={styles.contactsTitles}>
            <div className={styles.contactsHead}>
              <h2 className={styles.contactsTitle}>كيف تتواصل معك العميلة؟</h2>
              <span role="status" className={`${styles.status} ${contactsOk ? styles.statusOk : ''}`}>
                {contactsOk ? 'أضفتِ طريقة تواصل' : 'طريقة تواصل واحدة على الأقل مطلوبة'}
              </span>
            </div>
            <span id="contacts-rule" className={styles.contactsRule}>{CONTACTS_REQUIREMENT}</span>
            <span className={styles.contactsSub}>تظهر على إعلانك كما تكتبينها.</span>
          </div>
          {errors.contacts && <FieldError id="e-contacts" size="lg" alert>{errors.contacts}</FieldError>}

          <div className={styles.two}>
            {/* the rule in words, not a sample number: a full number in grey — even after
                "مثال:" — read as one already typed in */}
            {prefixed('whatsapp', country.dialCode, 'واتساب', { inputMode: 'tel', autoComplete: 'tel-national', placeholder: phonePlaceholder(values.country) })}
            {prefixed('phone', country.dialCode, 'هاتف', { inputMode: 'tel', placeholder: phonePlaceholder(values.country) })}
          </div>
          {prefixed('social', '@', 'إنستغرام', { autoComplete: 'off', placeholder: 'اسم الحساب فقط، بلا رابط' })}
        </fieldset>

        {/* 4. her account, at the end: she signs up (or in) with the listing. ARABIC COPY: DRAFT */}
        {me === undefined ? null : signedIn ? (
          <section className={styles.section} aria-labelledby="s-account">
            <h2 id="s-account" className={styles.sectionTitle}>حسابك</h2>
            <p className={fs.hint}>يُرسل الإعلان من حسابك <bdi dir="ltr">{me?.email}</bdi>.</p>
          </section>
        ) : (
          <section className={styles.section} aria-labelledby="s-account">
            {/* the heading, and the switch to the other way in beside it (as the contacts' heading and pill) */}
            <div className={styles.contactsHead}>
              <h2 id="s-account" className={styles.sectionTitle}>{accountMode === 'new' ? 'أنشئي حسابك' : 'سجّلي الدخول'}</h2>
              <Button variant="text" onClick={() => { setAccountMode((m) => (m === 'new' ? 'existing' : 'new')); setAccountErrors({}); }}>
                {accountMode === 'new' ? 'لديكِ حساب؟ سجّلي الدخول' : 'ليس لديكِ حساب؟ أنشئي حسابًا'}
              </Button>
            </div>
            <p className={fs.hint}>
              {accountMode === 'new'
                ? 'بالبريد الإلكتروني وكلمة مرور، لتتابعي إعلاناتك وتحذفيها متى شئتِ. ستصلكِ رسالة لتأكيد بريدك، ثم يصلنا إعلانك للمراجعة. لا\u00a0يظهر بريدك لأحد.'
                : 'سجّلي الدخول بحسابك، ويُرسل الإعلان منه.'}
            </p>
            <div className={styles.two}>
              <Field id="f-email" label="البريد الإلكتروني" error={accountErrors.email}>
                <input id="f-email" className={fs.input} type="email" dir="ltr" autoComplete="email" placeholder="name@example.com" spellCheck={false} value={email}
                  onChange={(e) => { setEmail(e.target.value); setAccountErrors((a) => ({ ...a, email: undefined, both: false })); }}
                  {...credentialsDescribedBy('f-email', accountErrors.email, accountErrors.both)} />
              </Field>
              <Field id="f-password" label="كلمة المرور" error={accountErrors.password}
                hint={accountMode === 'new' ? '٨ أحرف على الأقل.' : <a href="/forgot-password">نسيتِ كلمة المرور؟</a>}>
                <input id="f-password" className={fs.input} type="password" dir="ltr" autoComplete={accountMode === 'new' ? 'new-password' : 'current-password'} value={password}
                  onChange={(e) => { setPassword(e.target.value); setAccountErrors((a) => ({ ...a, password: undefined, both: false })); }}
                  {...describedBy('f-password', { error: accountErrors.password, hint: accountMode === 'new' })} />
              </Field>
            </div>
          </section>
        )}

        <div className={styles.submit}>
          {formMessage && <FieldError id="e-form" size="lg" alert>{formMessage}</FieldError>}
          <Button
            type="submit"
            variant="submit"
            aria-disabled={gate.blocked}
            {...(gate.reason === 'contacts' ? { 'aria-describedby': 'contacts-rule' } : {})}
          >
            {gate.label}
          </Button>
          {/* ARABIC COPY: DRAFT */}
          <p className={styles.note}>بإرسالك الإعلان توافقين على أن برينسيس لوحة إعلانات فقط، والاتفاق يتم بينك وبين العميلة مباشرة. نراجع كل إعلان قبل أن يظهر على اللوحة.</p>
        </div>
      </form>
    </>
  );
}
