// The posting form's rules, as pure functions (the component in components/form only
// renders them). Messages are the approved form design's, with Arabic number agreement
// corrected through lib/format.ts.
//
// None of this is enforcement: the server action re-validates with lib/listing.ts and the
// database re-checks with its constraints. This file exists so the form refuses early,
// with a reason, before she has filled everything in.

import { LIMITS, getCountry, type CategorySlug, type CountryCode } from './constants.ts';
import { charLength } from './listing.ts';
import { charsLabel, charsOverLabel, digitsLabel, toArabicDigits } from './format.ts';

export type FormValues = {
  name: string;
  title: string;
  category: CategorySlug | '';
  country: CountryCode;
  city: string;
  district: string;
  description: string;
  price: string;
  whatsapp: string;   // national number, as she types it after the dialling code
  phone: string;      // national number
  social: string;     // Instagram handle, with or without "@"
};

export type FormField = keyof FormValues | 'contacts';
export type FormErrors = Partial<Record<FormField, string>>;

export function emptyForm(country: CountryCode): FormValues {
  return { name: '', title: '', category: '', country, city: '', district: '', description: '', price: '', whatsapp: '', phone: '', social: '' };
}

/** Fields with a character limit and the label used in "too long" messages. */
export const COUNTED_FIELDS = {
  name: { limit: LIMITS.name, label: 'الاسم' },
  title: { limit: LIMITS.title, label: 'العنوان' },
  description: { limit: LIMITS.description, label: 'الوصف' },
  price: { limit: LIMITS.price, label: 'السعر' },
} as const;

export type CountedField = keyof typeof COUNTED_FIELDS;

/** "١٢ / ٦٠" and whether it is over. */
export function counter(field: CountedField, value: string): { text: string; over: boolean } {
  const { limit } = COUNTED_FIELDS[field];
  const n = charLength(value);
  return { text: `${toArabicDigits(n)} / ${toArabicDigits(limit)}`, over: n > limit };
}

function tooLong(field: CountedField, value: string): string | null {
  const { limit, label } = COUNTED_FIELDS[field];
  const over = charLength(value.trim()) - limit;
  return over > 0 ? `${label} أطول من المسموح ${charsOverLabel(over)}. اختصريه إلى ${charsLabel(limit)}.` : null;
}

const EASTERN = /[٠-٩۰-۹]/g;
const toLatin = (s: string) => s.replace(EASTERN, (d) => String(d.charCodeAt(0) & 0xf));

export type PhoneParse = { kind: 'empty' } | { kind: 'ok'; e164: string } | { kind: 'error'; message: string };

/** Her national number → E.164 for the selected country, or the design's message. */
export function parsePhone(raw: string, country: CountryCode, field: 'whatsapp' | 'phone'): PhoneParse {
  const k = getCountry(country);
  const digits = toLatin(raw).replace(/[\s\-()]/g, '').replace(/^0+/, '');
  if (!digits) return { kind: 'empty' };
  const name = field === 'whatsapp' ? 'رقم واتساب' : 'رقم الهاتف';
  if (!/^\d+$/.test(digits)) {
    return { kind: 'error', message: `${name} يحتوي على رموز غير الأرقام. اكتبي الأرقام فقط، مثل ${k.phone.example}.` };
  }
  if (digits.length !== k.phone.length || digits[0] !== k.phone.lead) {
    return {
      kind: 'error',
      message: `${name} غير مكتمل. اكتبي ${digitsLabel(k.phone.length)} بعد ${k.dialCode} تبدأ بـ ${toArabicDigits(k.phone.lead)}، مثل ${k.phone.example}.`,
    };
  }
  return { kind: 'ok', e164: `${k.dialCode}${digits}` };
}

export const PUBLISH_FAILED_MESSAGE = 'تعذّر نشر الإعلان الآن. حاولي مرة أخرى بعد لحظات.';

export const INSTAGRAM_MESSAGE = 'اكتبي اسم الحساب فقط بحروف إنجليزية وأرقام ونقاط، بلا رابط وبلا مسافات.';
export const CONTACTS_MISSING_MESSAGE =
  'لم تضيفي أي طريقة تواصل. اكتبي رقم واتساب، أو رقم هاتف، أو حساب إنستغرام — واحدة تكفي لنشر الإعلان.';
/** Shown under the contacts heading from the start (decision 4). */
export const CONTACTS_REQUIREMENT = 'أضيفي طريقة تواصل واحدة على الأقل: واتساب أو هاتف أو إنستغرام.';

export function hasAnyContact(v: Pick<FormValues, 'whatsapp' | 'phone' | 'social'>): boolean {
  return [v.whatsapp, v.phone, v.social].some((s) => s.trim() !== '');
}

/** Instagram handle as the form accepts it: an optional leading @, then the handle. */
export function isInstagramHandle(raw: string): boolean {
  return /^[A-Za-z0-9._]{1,30}$/.test(raw.trim().replace(/^@/, ''));
}

/**
 * At least one contact that will be accepted as typed — a complete number for the
 * country, or a valid Instagram handle. The contacts pill turns green only on this:
 * a half-typed number next to its own error is not "added".
 */
export function hasValidContact(v: Pick<FormValues, 'whatsapp' | 'phone' | 'social' | 'country'>): boolean {
  return parsePhone(v.whatsapp, v.country, 'whatsapp').kind === 'ok'
    || parsePhone(v.phone, v.country, 'phone').kind === 'ok'
    || (v.social.trim() !== '' && isInstagramHandle(v.social));
}

/** Every message the form would show for these values. Empty object = ready to send. */
export function validateForm(v: FormValues): FormErrors {
  const e: FormErrors = {};
  const required: Record<'name' | 'title' | 'description', string> = {
    name: 'اكتبي اسمك ليظهر على الإعلان، فالعميلة تتواصل مع شخص لا مع عنوان.',
    title: 'اكتبي عنوانًا قصيرًا يصف ما تقدمينه، مثل «تفصيل فساتين سهرة».',
    description: 'اكتبي وصفًا يقول للعميلة ماذا تقدمين وكيف تعملين.',
  };
  for (const f of ['name', 'title', 'description'] as const) {
    const msg = !v[f].trim() ? required[f] : tooLong(f, v[f]);
    if (msg) e[f] = msg;
  }
  const priceMsg = tooLong('price', v.price);
  if (priceMsg) e.price = priceMsg;
  if (!v.category) e.category = 'اختاري التصنيف الأقرب لما تقدمينه، ليجدكِ من تبحث عنه.';
  if (!v.city.trim()) e.city = `اكتبي المدينة التي تعملين فيها، مثل ${getCountry(v.country).cityExample}.`;
  for (const f of ['whatsapp', 'phone'] as const) {
    const p = parsePhone(v[f], v.country, f);
    if (p.kind === 'error') e[f] = p.message;
  }
  if (v.social.trim() && !isInstagramHandle(v.social)) e.social = INSTAGRAM_MESSAGE;
  if (!hasAnyContact(v)) e.contacts = CONTACTS_MISSING_MESSAGE;
  return e;
}

/** The photo in the picker: nothing is uploaded until she publishes (PhotoPicker). */
export type UploadState = 'idle' | 'preparing' | 'chosen' | 'rejected';

/** Where publishing is: uploading her photo (with its progress), then saving the listing. */
export type SubmitPhase = null | { uploading: number } | 'publishing';

export type SubmitGate = { blocked: boolean; label: string; reason: 'contacts' | 'preparing' | 'uploading' | 'submitting' | null };

/**
 * Whether submit is available, and the reason written on it when it is not.
 * Presentation only: the server refuses the same cases on its own.
 */
export function submitGate(v: FormValues, photo: UploadState, phase: SubmitPhase): SubmitGate {
  if (phase === 'publishing') return { blocked: true, label: 'جارٍ النشر، لحظات…', reason: 'submitting' };
  if (phase) return { blocked: true, label: `جارٍ رفع الصورة… ${toArabicDigits(phase.uploading)}٪`, reason: 'uploading' };
  // short enough to stay on one line at 380px
  if (!hasAnyContact(v)) return { blocked: true, label: 'أضيفي طريقة تواصل أولًا', reason: 'contacts' };
  if (photo === 'preparing') return { blocked: true, label: 'انتظري تجهيز الصورة', reason: 'preparing' };
  return { blocked: false, label: 'انشري الإعلان', reason: null };
}

/** What the server action receives. Phones become E.164; empty strings become absent. */
export function toPayload(v: FormValues, photo: string | null): Record<string, string | null> {
  const phone = (f: 'whatsapp' | 'phone') => {
    const p = parsePhone(v[f], v.country, f);
    return p.kind === 'ok' ? p.e164 : p.kind === 'empty' ? null : v[f];
  };
  const text = (s: string) => (s.trim() === '' ? null : s.trim());
  return {
    name: text(v.name),
    title: text(v.title),
    category: v.category || null,
    country: v.country,
    city: text(v.city),
    district: text(v.district),
    description: text(v.description),
    price: text(v.price),
    photo,
    whatsapp: phone('whatsapp'),
    phone: phone('phone'),
    social: text(v.social),
  };
}
