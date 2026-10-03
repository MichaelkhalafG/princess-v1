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
  { slug: 'makeup', label: 'مكياج', tone: 'accent', icon: 'M3 21l8.5-8.5M10.5 11.5l6-7.5a2.1 2.1 0 0 1 3 3l-7.5 6z' },
  { slug: 'nails', label: 'أظافر', tone: 'accent', icon: 'M9.5 3h5v4h-5zM9.5 7h5l1.5 3.5V20a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-9.5zM8 14h8' },
  { slug: 'henna', label: 'حنّة', tone: 'ink', icon: 'M19 5l-2.5 9.5L11 20l-7-7 5.5-5.5zM19 5l-6 6M9 16l2-2' },
  { slug: 'tailoring', label: 'خياطة وتفصيل', tone: 'secondary', icon: 'M6 4h10M6 20h10M7 4v16M15 4v16M7 8h8M7 12h8M7 16h8M21 3l-4 6M20.3 3.7a1 1 0 1 1 .7.7' },
  { slug: 'clothes-for-sale', label: 'بيع ملابس', tone: 'secondary', icon: 'M12 3a2 2 0 0 1 2 2c0 1.5-2 2-2 3.5V10M12 10L3 16.5A1.5 1.5 0 0 0 4 19h16a1.5 1.5 0 0 0 1-2.5z' },
  { slug: 'cooking-and-desserts', label: 'طبخ وحلويات', tone: 'highlight', icon: 'M3 12h18a9 9 0 0 1-18 0zM13 11l5-8M15.5 11l3-8M18 3l.5 0' },
  { slug: 'private-tutoring', label: 'دروس خصوصية', tone: 'highlight', icon: 'M12 6c-2-1.5-5-2-9-2v14c4 0 7 .5 9 2 2-1.5 5-2 9-2V4c-4 0-7 .5-9 2zM12 6v14' },
  { slug: 'cleaning', label: 'تنظيف منازل', tone: 'secondary', icon: 'M9 9h6l1 12H8zM10 9V6a2 2 0 0 1 2-2h5M17 4h2M17 4v2M14 4l1 2' },
  { slug: 'childcare', label: 'رعاية أطفال', tone: 'highlight', icon: 'M12 3a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9M12 12v5M12 17a2 2 0 1 0 0 4a2 2 0 1 0 0-4' },
  { slug: 'elderly-care', label: 'رعاية كبار السن', tone: 'ink', icon: 'M14 21V7a3 3 0 0 0-6 0v1M12 21h4' },
] as const satisfies readonly { slug: string; label: string; tone: CategoryTone; icon: string }[];

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];
export type Category = (typeof CATEGORIES)[number];

// The "all categories" entry exists only in the filters, never in the data.
export const ALL_CATEGORIES = {
  label: 'الكل',
  // what the sticky filter bar says when no category is picked
  barLabel: 'كل الفئات',
  icon: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
} as const;

// phone: the national number she types after the dialling code — its length and first
// digit, from the approved form design. The validator and the database CHECK
// (listings_phone_country_check) both enforce it.
// OPEN DECISION: Saudi and UAE numbers must start with 5 (mobile), so a shop landline is
// refused there — a woman working from a shop cannot post its number.
// cityExample / districtExample: the form's placeholders for that country.
export const COUNTRIES = [
  { code: 'EG', name: 'مصر', flag: '🇪🇬', currency: 'ج.م', dialCode: '+20', phone: { length: 10, lead: '1', example: '1012345678' }, cityExample: 'القاهرة', districtExample: 'مدينة نصر' },
  { code: 'SA', name: 'السعودية', flag: '🇸🇦', currency: 'ر.س', dialCode: '+966', phone: { length: 9, lead: '5', example: '512345678' }, cityExample: 'الرياض', districtExample: 'حي النرجس' },
  { code: 'AE', name: 'الإمارات', flag: '🇦🇪', currency: 'د.إ', dialCode: '+971', phone: { length: 9, lead: '5', example: '501234567' }, cityExample: 'دبي', districtExample: 'جميرا' },
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
  name: 60,
  title: 80,
  description: 600,
  price: 40,
} as const;

// Listing photos: public Supabase Storage bucket.
export const PHOTO_BUCKET = 'listing-photos';
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
