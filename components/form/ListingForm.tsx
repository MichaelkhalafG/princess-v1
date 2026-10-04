'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { createListing } from '@/app/new/actions.ts';
import { CATEGORIES, getCountry, type CategorySlug, type CountryCode } from '@/lib/constants.ts';
import { pricePlaceholder } from '@/lib/format.ts';
import { nextRadioIndex, radioTabIndex } from '@/lib/radio.ts';
import { UPLOAD_FAILED_MESSAGE, uploadPhoto } from '@/lib/upload.ts';
import {
  CONTACTS_REQUIREMENT, PUBLISH_FAILED_MESSAGE, counter, emptyForm, hasValidContact, submitGate, toPayload, validateForm,
  type FormErrors, type FormField, type FormValues, type SubmitPhase, type UploadState,
} from '@/lib/listing-form.ts';
import { Button } from '../Button.tsx';
import { CategoryChip } from '../CategoryChip.tsx';
import { CountrySelector } from '../CountrySelector.tsx';
import { Field, FieldError, describedBy, fieldStyles as fs } from './Field.tsx';
import { PhotoPicker } from './PhotoPicker.tsx';
import styles from './ListingForm.module.css';

/** Where focus goes for each field's error, in the order the fields appear. */
const FOCUS_ORDER: [FormField, string][] = [
  ['name', '#f-name'], ['city', '#f-city'], ['category', '#g-category [role="radio"]'], ['title', '#f-title'],
  ['description', '#f-description'], ['price', '#f-price'], ['whatsapp', '#f-whatsapp'], ['phone', '#f-phone'],
  ['social', '#f-social'], ['contacts', '#f-whatsapp'],
];

function isRedirect(err: unknown): boolean {
  const digest = (err as { digest?: unknown } | null)?.digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
}

export function ListingForm({ initialCountry, contextQuery = '' }: { initialCountry: CountryCode; contextQuery?: string }) {
  const [values, setValues] = useState<FormValues>(() => emptyForm(initialCountry));
  const [errors, setErrors] = useState<FormErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ state: UploadState; file: File | null }>({ state: 'idle', file: null });
  const [phase, setPhase] = useState<SubmitPhase>(null);
  // The photo goes up only when she publishes. If it went up but the listing was then not
  // saved, the next attempt reuses it rather than uploading (and orphaning) a second copy.
  const uploaded = useRef<{ file: File; path: string } | null>(null);
  const abortUpload = useRef<(() => void) | null>(null);
  useEffect(() => () => abortUpload.current?.(), []);

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
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      focusFirst(errs);
      return;
    }
    setFormMessage(null);

    // 1. her photo, if she chose one (and it is not already up from a failed attempt)
    let path: string | null = null;
    if (photo.file) {
      if (uploaded.current?.file === photo.file) {
        path = uploaded.current.path;
      } else {
        setPhase({ uploading: 0 });
        const job = uploadPhoto(photo.file, (p) => setPhase({ uploading: p }));
        abortUpload.current = job.abort;
        try {
          path = await job.promise;
          uploaded.current = { file: photo.file, path };
        } catch {
          // nothing she typed is lost: the form and the photo are still here
          setPhase(null);
          setFormMessage(UPLOAD_FAILED_MESSAGE);
          return;
        } finally {
          abortUpload.current = null;
        }
      }
    }

    // 2. the listing itself
    setPhase('publishing');
    try {
      // On success the action redirects to the new listing's page.
      const res = await createListing(toPayload(values, path), contextQuery);
      setErrors(res.errors);
      setFormMessage(res.message);
      focusFirst(res.errors);
    } catch (err) {
      if (isRedirect(err)) throw err;
      setFormMessage(PUBLISH_FAILED_MESSAGE);
    }
    setPhase(null);
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
        <p className={styles.lead}>دقيقتان، ويظهر إعلانك لكل سيدة في بلدك. بلا حساب، وبلا عمولة.</p>
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
            {/* "مثال:" like every other example in the form: a bare number in an empty
                field read as a number already filled in */}
            {prefixed('whatsapp', country.dialCode, 'واتساب', { inputMode: 'tel', autoComplete: 'tel-national', placeholder: `مثال: ${country.phone.example}` })}
            {prefixed('phone', country.dialCode, 'هاتف', { inputMode: 'tel', placeholder: `مثال: ${country.phone.example}` })}
          </div>
          {prefixed('social', '@', 'إنستغرام', { autoComplete: 'off', placeholder: 'اسم الحساب فقط، بلا رابط' })}
        </fieldset>

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
          <p className={styles.note}>بنشرك الإعلان توافقين على أن برينسيس لوحة إعلانات فقط، والاتفاق يتم بينك وبين العميلة مباشرة.</p>
        </div>
      </form>
    </>
  );
}
