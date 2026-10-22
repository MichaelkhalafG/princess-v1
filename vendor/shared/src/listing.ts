// The shape of a listing, and the one validator every write goes through before it
// reaches Supabase. The database enforces the same rules independently (CHECK
// constraints + column grants in supabase/migrations) because the anon key can insert
// without ever passing through this file.
//
// Validation is a filter: the output is built field by field from the rules below, so
// any key without a rule is dropped, never passed through.

import { LIMITS, isCategorySlug, isCountryCode, phonePatternSource, type CategorySlug, type CountryCode } from './constants.ts';

export type Listing = {
  id: string;
  name: string;
  title: string;
  category: CategorySlug;
  country: CountryCode;
  city: string;
  district: string | null;
  description: string;
  /** Free text exactly as she typed it ("٥٠ للساعة", "حسب الطلب"). Never a number, never sorted. */
  price: string | null;
  /** Object path inside the listing-photos bucket, e.g. "<uuid>.webp". Never a full URL. */
  photo: string | null;
  /** E.164, e.g. "+201001234567". */
  whatsapp: string | null;
  /** E.164, e.g. "+966501234567". */
  phone: string | null;
  /** Instagram handle without "@". The column is called `social` per the brief. */
  social: string | null;
  created_at: string;
};

export type NewListing = Omit<Listing, 'id' | 'created_at'>;

/** The columns the public may write — mirrors the column-level GRANT in the migration. */
export const WRITABLE_COLUMNS = [
  'name', 'title', 'category', 'country', 'city', 'district', 'description',
  'price', 'photo', 'whatsapp', 'phone', 'social',
] as const satisfies readonly (keyof NewListing)[];

/** The columns read back for display. */
export const LISTING_COLUMNS = ['id', ...WRITABLE_COLUMNS, 'created_at'].join(',');

export type ListingField = (typeof WRITABLE_COLUMNS)[number];
export type ErrorCode = 'required' | 'too_long' | 'invalid' | 'contact_required';
export type ValidationErrors = Partial<Record<ListingField | 'contact', ErrorCode>>;
export type ValidationResult =
  | { ok: true; value: NewListing }
  | { ok: false; errors: ValidationErrors };

export const PHONE_PATTERN = /^\+[1-9][0-9]{6,14}$/;
export const INSTAGRAM_PATTERN = /^[A-Za-z0-9._]{1,30}$/;
export const PHOTO_PATH_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

/**
 * The server's own messages, returned when it refuses a submission. The form shows
 * richer, live messages of its own; these exist so a refusal never depends on the form.
 */
export const SERVER_MESSAGES: Record<keyof ValidationErrors, Record<ErrorCode, string>> = (() => {
  const base = (required: string, invalid = 'القيمة غير صالحة.', tooLong = 'النص أطول من المسموح.') =>
    ({ required, invalid, too_long: tooLong, contact_required: required });
  return {
    name: base('الاسم مطلوب.'),
    title: base('العنوان مطلوب.'),
    category: base('التصنيف مطلوب.', 'التصنيف غير موجود في القائمة.'),
    country: base('الدولة مطلوبة.', 'الدولة غير موجودة في القائمة.'),
    city: base('المدينة مطلوبة.'),
    district: base('الحي غير صالح.'),
    description: base('الوصف مطلوب.'),
    price: base('السعر غير صالح.', 'السعر غير صالح.', 'السعر أطول من المسموح.'),
    photo: base('الصورة غير صالحة.'),
    whatsapp: base('رقم واتساب غير صالح.', 'رقم واتساب لا يطابق أرقام الدولة المختارة.'),
    phone: base('رقم الهاتف غير صالح.', 'رقم الهاتف لا يطابق أرقام الدولة المختارة.'),
    social: base('حساب إنستغرام غير صالح.', 'اسم حساب إنستغرام غير صالح.'),
    contact: base('رفض الخادم الإعلان: لا توجد أي طريقة تواصل. يلزم رقم واتساب أو رقم هاتف أو حساب إنستغرام.'),
  };
})();

/** Length as Postgres char_length counts it (code points, not UTF-16 units). */
export function charLength(s: string): number {
  return [...s].length;
}

const EASTERN_DIGITS = /[٠-٩۰-۹]/g;
function toLatinDigits(s: string): string {
  return s.replace(EASTERN_DIGITS, (d) => String(d.charCodeAt(0) & 0xf));
}

/** "٠١٠ ١٢٣-٤٥٦٧" → "0101234567"; "00966…" → "+966…". Does not guess a country code. */
export function normalizePhone(raw: string): string {
  const s = toLatinDigits(raw).replace(/[\s\-().]/g, '');
  return s.startsWith('00') ? `+${s.slice(2)}` : s;
}

/** "@Princess.Nails" → "Princess.Nails". */
export function normalizeInstagram(raw: string): string {
  return raw.trim().replace(/^@/, '');
}

type Text = { kind: 'missing' } | { kind: 'wrong_type' } | { kind: 'value'; value: string };

function readText(input: Record<string, unknown>, key: string): Text {
  const v = input[key];
  if (v === undefined || v === null) return { kind: 'missing' };
  if (typeof v !== 'string') return { kind: 'wrong_type' };
  const t = v.trim();
  return t === '' ? { kind: 'missing' } : { kind: 'value', value: t };
}

export function validateListing(input: unknown): ValidationResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, errors: { name: 'required' } };
  }
  const src = input as Record<string, unknown>;
  const errors: ValidationErrors = {};

  const requiredText = (key: 'name' | 'title' | 'description' | 'city', max?: number): string => {
    const t = readText(src, key);
    if (t.kind === 'missing') { errors[key] = 'required'; return ''; }
    if (t.kind === 'wrong_type') { errors[key] = 'invalid'; return ''; }
    if (max !== undefined && charLength(t.value) > max) { errors[key] = 'too_long'; return ''; }
    return t.value;
  };

  const optionalText = (key: 'district' | 'price', max?: number): string | null => {
    const t = readText(src, key);
    if (t.kind === 'missing') return null;
    if (t.kind === 'wrong_type') { errors[key] = 'invalid'; return null; }
    if (max !== undefined && charLength(t.value) > max) { errors[key] = 'too_long'; return null; }
    return t.value;
  };

  const optionalPattern = (
    key: 'photo' | 'whatsapp' | 'phone' | 'social',
    pattern: RegExp,
    normalize: (s: string) => string = (s) => s,
  ): string | null => {
    const t = readText(src, key);
    if (t.kind === 'missing') return null;
    if (t.kind === 'wrong_type') { errors[key] = 'invalid'; return null; }
    const v = normalize(t.value);
    if (!pattern.test(v)) { errors[key] = 'invalid'; return null; }
    return v;
  };

  const name = requiredText('name', LIMITS.name);
  const title = requiredText('title', LIMITS.title);
  const description = requiredText('description', LIMITS.description);
  const city = requiredText('city');
  const district = optionalText('district');
  const price = optionalText('price', LIMITS.price);

  const category = src.category;
  if (category === undefined || category === null || category === '') errors.category = 'required';
  else if (!isCategorySlug(category)) errors.category = 'invalid';

  const country = src.country;
  if (country === undefined || country === null || country === '') errors.country = 'required';
  else if (!isCountryCode(country)) errors.country = 'invalid';

  const photo = optionalPattern('photo', PHOTO_PATH_PATTERN);
  const whatsapp = optionalPattern('whatsapp', PHONE_PATTERN, normalizePhone);
  const phone = optionalPattern('phone', PHONE_PATTERN, normalizePhone);
  const social = optionalPattern('social', INSTAGRAM_PATTERN, normalizeInstagram);

  // A number must belong to the listing's country: its dialling code, length and first digit.
  if (isCountryCode(country)) {
    const local = new RegExp(phonePatternSource(country));
    if (whatsapp && !local.test(whatsapp)) errors.whatsapp = 'invalid';
    if (phone && !local.test(phone)) errors.phone = 'invalid';
  }

  // At least one contact method. A malformed one already has its own error and does not count.
  const anyContactGiven = (['whatsapp', 'phone', 'social'] as const).some((k) => readText(src, k).kind !== 'missing');
  if (!anyContactGiven) errors.contact = 'contact_required';

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      name, title, description, city, district, price, photo, whatsapp, phone, social,
      category: category as CategorySlug,
      country: country as CountryCode,
    },
  };
}
