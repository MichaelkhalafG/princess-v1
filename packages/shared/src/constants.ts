// The single list of categories and countries. The form, the filters, the cards and the
// database CHECK constraints all follow this file (tests/unit/schema-sync.test.ts fails
// if supabase/migrations drifts from it).
//
// Adding a category: one line in CATEGORIES, plus its slug in the listings_category_check
// constraint (the sync test will tell you if you forget).
//
// icon: a single SVG path in a 24×24 box, drawn as a 1.75 stroke line icon — copied from
// the approved landing design, never redrawn.
// tone: which palette pair the badge and the monogram panel use (see globals.css).

export type CategoryTone = 'accent' | 'secondary' | 'highlight' | 'ink';

export const CATEGORIES = [
  { slug: 'hairdressing', label: 'كوافير وتجميل', tone: 'accent', icon: 'M6 3.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5M6 15.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5M20 4L8.1 15.6M14.5 14.5L20 20M8.1 8.4L12 12' },
  { slug: 'makeup', label: 'مكياج', tone: 'accent', icon: 'M9 21h6a1 1 0 0 0 1-1v-7H8v7a1 1 0 0 0 1 1zM9.5 13V9h5v4M10 9V5.5L14 3v6' },
  { slug: 'nails', label: 'أظافر', tone: 'accent', icon: 'M10 3h4v6h-4zM7 9h10v10.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5zM7 14h10' },
  { slug: 'henna', label: 'حنّة', tone: 'ink', icon: 'M8 21c-2.5-1.5-4-4-4-6.5V10a1.5 1.5 0 0 1 3 0v3M7 12V5.5a1.5 1.5 0 0 1 3 0V11M10 10.5V4.5a1.5 1.5 0 0 1 3 0v6M13 10.5V6a1.5 1.5 0 0 1 3 0v8c0 4-2.5 7-6 7zM10 15.5h.01M12.5 17.5h.01M8.5 18h.01' },
  { slug: 'tailoring', label: 'خياطة وتفصيل', tone: 'secondary', icon: 'M5 19L17 7M17 7l2-2a1.4 1.4 0 0 0-2-2l-2 2zM15.5 5.5L18.5 8.5M5 19c-2 1-2.5-1.5-.5-2.5 3-1.5 6 .5 9 2.5 2 1.3 4 1.5 6 .5' },
  { slug: 'clothes-for-sale', label: 'بيع ملابس', tone: 'secondary', icon: 'M12 3a2 2 0 0 1 2 2c0 1.5-2 2-2 3.5V10M12 10L3 16.5A1.5 1.5 0 0 0 4 19h16a1.5 1.5 0 0 0 1-2.5z' },
  { slug: 'cooking-and-desserts', label: 'طبخ وحلويات', tone: 'highlight', icon: 'M3 12h18a9 9 0 0 1-18 0zM13 11l5-8M15.5 11l3-8M18 3l.5 0' },
  { slug: 'private-tutoring', label: 'دروس خصوصية', tone: 'highlight', icon: 'M12 6c-2-1.5-5-2-9-2v14c4 0 7 .5 9 2 2-1.5 5-2 9-2V4c-4 0-7 .5-9 2zM12 6v14' },
  { slug: 'cleaning', label: 'تنظيف منازل', tone: 'secondary', icon: 'M8 10h6l1 10a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1zM9 10V7h4v3M9 7V4h6l2 2h-4v1M17 9l2-1M17 11h2.5M17 13l2 1' },
  { slug: 'childcare', label: 'رعاية أطفال', tone: 'highlight', icon: 'M4 11h11V4a7 7 0 0 0-7 7M4 11a7 7 0 0 0 7 6 7 7 0 0 0 7-6V4l2.5-1M7.5 20.5a1.5 1.5 0 1 0 0-.01M15.5 20.5a1.5 1.5 0 1 0 0-.01' },
  { slug: 'elderly-care', label: 'رعاية كبار السن', tone: 'ink', icon: 'M9 3a2 2 0 1 0 0 4a2 2 0 1 0 0-4M9 8.5c-1.5 1.5-2 4-1.5 6.5L6 21M8 15l3 2 1 4M8.5 10l4 2.5M14 21V12.5a1.5 1.5 0 0 1 3 0' },
] as const satisfies readonly { slug: string; label: string; tone: CategoryTone; icon: string }[];

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];
export type Category = (typeof CATEGORIES)[number];

// The "all categories" entry exists only in the filters, never in the data.
export const ALL_CATEGORIES = {
  // one name everywhere: the bar's chip, the header summary, the grid heading
  label: 'كل الفئات',
  icon: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
} as const;

// phone: the national number she types after the dialling code — its length and first
// digit, from the approved form design. The validator and the database CHECK
// (listings_phone_country_check) both enforce it.
// OPEN DECISION: Saudi and UAE numbers must start with 5 (mobile), so a shop landline is
// refused there — a woman working from a shop cannot post its number.
// cityExample / districtExample: the form's placeholders for that country.
export const COUNTRIES = [
  { code: 'EG', name: 'مصر', flag: '/flags/eg.svg', currency: 'ج.م', dialCode: '+20', phone: { length: 10, lead: '1', example: '1012345678' }, cityExample: 'القاهرة', districtExample: 'مدينة نصر' },
  { code: 'SA', name: 'السعودية', flag: '/flags/sa.svg', currency: 'ر.س', dialCode: '+966', phone: { length: 9, lead: '5', example: '512345678' }, cityExample: 'الرياض', districtExample: 'حي النرجس' },
  { code: 'AE', name: 'الإمارات', flag: '/flags/ae.svg', currency: 'د.إ', dialCode: '+971', phone: { length: 9, lead: '5', example: '501234567' }, cityExample: 'دبي', districtExample: 'جميرا' },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]['code'];
export type Country = (typeof COUNTRIES)[number];

export const CATEGORY_SLUGS: readonly CategorySlug[] = CATEGORIES.map((c) => c.slug);
export const COUNTRY_CODES: readonly CountryCode[] = COUNTRIES.map((c) => c.code);

export function isCategorySlug(value: unknown): value is CategorySlug {
  return typeof value === 'string' && (CATEGORY_SLUGS as readonly string[]).includes(value);
}

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && (COUNTRY_CODES as readonly string[]).includes(value);
}

export function getCategory(slug: CategorySlug): Category {
  return CATEGORIES.find((c) => c.slug === slug)!;
}

export function getCountry(code: CountryCode): Country {
  return COUNTRIES.find((c) => c.code === code)!;
}

/** The full E.164 pattern a phone/WhatsApp number must match in this country. */
export function phonePatternSource(code: CountryCode): string {
  const { dialCode, phone } = getCountry(code);
  return `^\\${dialCode}${phone.lead}[0-9]{${phone.length - 1}}$`;
}

// Text limits — the validator and the database CHECK constraints both read these values
// (the sync test compares them with the migration).
export const LIMITS = {
  name: 40,
  title: 80,
  description: 600,
  price: 40,
} as const;

// Listing photos: public Supabase Storage bucket.
export const PHOTO_BUCKET = 'listing-photos';
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
