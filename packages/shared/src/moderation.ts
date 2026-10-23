// What the API's moderation codes say to her, for the web and the app. The codes are the API's
// (apps/api/config/princess.php); packages/shared/cases/listing-validation.json lists them once,
// and both test suites fail if either side has a code the other lacks.
//
// ARABIC COPY: DRAFT, NOT YET APPROVED. The three lists (statuses, reasons, report reasons) are
// first versions to be rewritten.

/** Where one of her listings is. */
export const LISTING_STATUSES = {
  unverified: 'بانتظار تأكيد بريدك الإلكتروني',
  pending: 'قيد المراجعة',
  published: 'على اللوحة',
  rejected: 'لم يُنشر',
  removed: 'أُزيل من اللوحة',
} as const;

export type ListingStatus = keyof typeof LISTING_STATUSES;

/** Why a moderator did not publish a listing, or took it down. Shown to her only. */
export const MODERATION_REASONS = {
  not_a_service: 'الإعلان ليس عن خدمة أو منتج تقدّمه سيدة.',
  prohibited: 'المحتوى غير مسموح به على برينسيس.',
  misleading: 'في الإعلان معلومات مضللة أو غير صحيحة.',
  contact: 'بيانات التواصل غير صحيحة أو ليست لكِ.',
  duplicate: 'الإعلان مكرر.',
  photo: 'الصورة غير مناسبة.',
  other: 'سبب آخر.',
} as const;

/** The reason the API gives every listing of a banned account. */
export const BANNED_ACCOUNT_REASON = 'أُوقف هذا الحساب عن النشر.';

export function reasonLabel(code: string | null): string | null {
  if (code === null) return null;
  if (code === 'account_banned') return BANNED_ACCOUNT_REASON;
  return (MODERATION_REASONS as Record<string, string>)[code] ?? null;
}

/** Why a visitor reports a listing. */
export const REPORT_REASONS = {
  scam: 'احتيال أو نصب',
  offensive: 'محتوى مسيء أو غير لائق',
  wrong_contact: 'الرقم ليس لصاحبة الإعلان',
  misleading: 'معلومات مضللة',
  spam: 'إعلان مكرر أو مزعج',
  other: 'سبب آخر',
} as const;

export type ReportReason = keyof typeof REPORT_REASONS;
