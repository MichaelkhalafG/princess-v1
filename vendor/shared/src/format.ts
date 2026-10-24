// Display formatting. Pure functions: everything time-dependent takes `now` as a parameter.

import { COUNTRIES, getCountry, type CountryCode } from './constants.ts';

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

/** 125 → "١٢٥". */
export function toArabicDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => ARABIC_INDIC[Number(d)]);
}

/** The forms of one counted noun. `few`/`many`/`other` receive the number in Arabic-Indic digits. */
export type CountedNoun = {
  zero: string;
  one: string;
  two: string;
  few: (d: string) => string;   // n % 100 in 3..10   — plural
  many: (d: string) => string;  // n % 100 in 11..99  — accusative singular
  other: (d: string) => string; // 100–102, 200, 1000 … — genitive singular
};

/** Arabic number agreement, by the CLDR plural categories for Arabic. */
export function countLabel(n: number, noun: CountedNoun): string {
  if (!Number.isInteger(n) || n < 0) throw new RangeError(`count must be a non-negative integer, got ${n}`);
  if (n === 0) return noun.zero;
  if (n === 1) return noun.one;
  if (n === 2) return noun.two;
  const d = toArabicDigits(n);
  const r = n % 100;
  if (r >= 3 && r <= 10) return noun.few(d);
  if (r >= 11 && r <= 99) return noun.many(d);
  return noun.other(d);
}

const LISTINGS_NOUN: CountedNoun = {
  zero: 'لا نتائج', // the design's wording for zero
  one: 'إعلان واحد',
  two: 'إعلانان',
  few: (d) => `${d} إعلانات`,
  many: (d) => `${d} إعلانًا`,
  other: (d) => `${d} إعلان`,
};

/** "لا نتائج", "إعلان واحد", "إعلانان", "٣ إعلانات", "١١ إعلانًا", "١٠٠ إعلان". */
export function listingCountLabel(n: number): string {
  return countLabel(n, LISTINGS_NOUN);
}

/** "بحرف واحد", "بحرفين", "بـ ٣ أحرف", "بـ ١١ حرفًا", "بـ ١٠٠ حرف" — how far over a limit. */
export function charsOverLabel(n: number): string {
  return countLabel(n, {
    zero: '', one: 'بحرف واحد', two: 'بحرفين',
    few: (d) => `بـ ${d} أحرف`, many: (d) => `بـ ${d} حرفًا`, other: (d) => `بـ ${d} حرف`,
  });
}

/** "٦٠ حرفًا", "٦٠٠ حرف", "٤٠ حرفًا" — a limit stated as a count of letters. */
export function charsLabel(n: number): string {
  return countLabel(n, {
    zero: 'لا أحرف', one: 'حرفًا واحدًا', two: 'حرفين',
    few: (d) => `${d} أحرف`, many: (d) => `${d} حرفًا`, other: (d) => `${d} حرف`,
  });
}

/** "رقمًا واحدًا", "رقمين", "٩ أرقام", "١١ رقمًا" — as the object of "اكتبي". */
export function digitsLabel(n: number): string {
  return countLabel(n, {
    zero: 'لا أرقام', one: 'رقمًا واحدًا', two: 'رقمين',
    few: (d) => `${d} أرقام`, many: (d) => `${d} رقمًا`, other: (d) => `${d} رقم`,
  });
}

/** "+20 101 234 5678" for display. Falls back to the stored value if no country matches. */
export function formatPhone(e164: string): string {
  const k = COUNTRIES.find((c) => e164.startsWith(c.dialCode));
  if (!k) return e164;
  const national = e164.slice(k.dialCode.length).replace(/(\d{2,3})(\d{3})(\d{4})$/, '$1 $2 $3');
  return `${k.dialCode} ${national}`;
}

/** "١٫٨ ميغابايت" */
/** "١٫٨ ميغابايت", or "٤٥ كيلوبايت" under 1 MB — a small photo never reads "٠٫٠ ميغابايت". */
export function megabytesLabel(bytes: number): string {
  if (bytes < 1048576) return `${toArabicDigits(Math.max(1, Math.round(bytes / 1024)))} كيلوبايت`;
  return `${toArabicDigits((bytes / 1048576).toFixed(1)).replace('.', '٫')} ميغابايت`;
}

/** An empty phone field's hint: the rule in words ("١٠ أرقام تبدأ بـ ١"), never a sample
    number — a full number in grey read as one already typed in. */
export function phonePlaceholder(country: CountryCode): string {
  const { phone } = getCountry(country);
  return `${digitsLabel(phone.length)} تبدأ بـ ${toArabicDigits(phone.lead)}`;
}

// The wording is spelled out here, not taken from Intl.RelativeTimeFormat: the app's JavaScript
// engine (Hermes, on Android) has no RelativeTimeFormat, and the web and the app must say the
// same thing. From 2 upwards it is exactly what Intl says in Arabic (tests/format.test.ts
// compares every count with Node's Intl); for 1 the design says "قبل ساعة" where Intl says
// "قبل ساعة واحدة", and "أمس" for a day.
type Unit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
const ONE: Record<Unit, string> = {
  minute: 'قبل دقيقة',
  hour: 'قبل ساعة',
  day: 'أمس',
  week: 'قبل أسبوع',
  month: 'قبل شهر',
  year: 'قبل سنة',
};

// Arabic counts its nouns in classes (CLDR's plural rules): 2 takes the dual; a number ending
// in 3–10 the plural; ending in 11–99 the singular, with tanwin where the noun takes it; the
// rest (100, 101, 102 …) the bare singular.
const FORMS: Record<Unit, { two: string; few: string; many: string; other: string }> = {
  minute: { two: 'دقيقتين', few: 'دقائق', many: 'دقيقة', other: 'دقيقة' },
  hour: { two: 'ساعتين', few: 'ساعات', many: 'ساعة', other: 'ساعة' },
  day: { two: 'يومين', few: 'أيام', many: 'يومًا', other: 'يوم' },
  week: { two: 'أسبوعين', few: 'أسابيع', many: 'أسبوعًا', other: 'أسبوع' },
  month: { two: 'شهرين', few: 'أشهر', many: 'شهرًا', other: 'شهر' },
  year: { two: 'سنتين', few: 'سنوات', many: 'سنة', other: 'سنة' },
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "قبل ساعتين", "قبل ٣ ساعات", "قبل ١١ ساعة" … for n ≥ 1. */
export function ago(n: number, unit: Unit): string {
  if (n === 1) return ONE[unit];
  const f = FORMS[unit];
  if (n === 2) return `قبل ${f.two}`;
  const tail = n % 100;
  const noun = tail >= 3 && tail <= 10 ? f.few : tail >= 11 ? f.many : f.other;
  return `قبل ${toArabicDigits(n)} ${noun}`;
}

/** "قبل ساعة", "قبل ٣ ساعات", "أمس", "قبل يومين" … relative to `now`. */
export function relativeDate(createdAt: string | Date, now: Date): string {
  const t = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const diff = now.getTime() - t.getTime();
  if (diff < MINUTE) return 'الآن';
  if (diff < HOUR) return ago(Math.floor(diff / MINUTE), 'minute');
  if (diff < DAY) return ago(Math.floor(diff / HOUR), 'hour');
  if (diff < 7 * DAY) return ago(Math.floor(diff / DAY), 'day');
  if (diff < 30 * DAY) return ago(Math.floor(diff / (7 * DAY)), 'week');
  if (diff < 365 * DAY) return ago(Math.floor(diff / (30 * DAY)), 'month');
  return ago(Math.floor(diff / (365 * DAY)), 'year');
}

/** "القاهرة، مدينة نصر" — or the city alone when there is no district. */
export function areaText(city: string, district: string | null): string {
  return district ? `${city}، ${district}` : city;
}

/** The price field's placeholder for the selected country. Never stored. */
export function pricePlaceholder(country: CountryCode): string {
  return `مثال: ${toArabicDigits(50)} ${getCountry(country).currency}`;
}

/** The search field's placeholder for the selected country. */
export function searchPlaceholder(country: CountryCode): string {
  return `عمّ تبحثين في ${getCountry(country).name}؟`;
}

export type ContactKind = 'whatsapp' | 'phone' | 'social';
/** display: what the detail page prints beside the label ("+20 101 234 5678", "@mona.nails"). */
export type ContactLink = { kind: ContactKind; href: string; label: string; shortLabel: string; display: string };

const CONTACT_LABELS: Record<ContactKind, { label: string; shortLabel: string }> = {
  whatsapp: { label: 'واتساب', shortLabel: 'واتساب' },
  phone: { label: 'اتصال', shortLabel: 'اتصال' },
  social: { label: 'إنستغرام', shortLabel: 'إنستغرام' },
};

export function contactHref(kind: ContactKind, value: string): string {
  if (kind === 'whatsapp') return `https://wa.me/${value.replace(/^\+/, '')}`;
  if (kind === 'phone') return `tel:${value}`;
  return `https://www.instagram.com/${encodeURIComponent(value)}/`;
}

/**
 * The contact methods she gave, in the design's order: WhatsApp, call, Instagram.
 * The first one is the card's main button; the rest are the round buttons.
 */
export function contactLinks(l: { whatsapp: string | null; phone: string | null; social: string | null }): ContactLink[] {
  return (['whatsapp', 'phone', 'social'] as const)
    .filter((k) => l[k])
    .map((k) => ({
      kind: k,
      href: contactHref(k, l[k]!),
      display: k === 'social' ? `@${l[k]}` : formatPhone(l[k]!),
      ...CONTACT_LABELS[k],
    }));
}
