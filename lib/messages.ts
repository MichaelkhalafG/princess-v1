// What the API's answers say to her, in the site's words. The listing fields keep the server
// messages already in @princess/shared/listing.ts; the rest is here.
//
// ARABIC COPY: DRAFT, NOT YET APPROVED.

import { toArabicDigits } from '@princess/shared/format.ts';
import type { ApiResult } from './client.ts';

export const ACCOUNT_MESSAGES: Record<'email' | 'password', Record<string, string>> = {
  email: {
    required: 'البريد الإلكتروني مطلوب.',
    invalid: 'اكتبي بريدًا إلكترونيًا صحيحًا، مثل name@example.com.',
    too_long: 'البريد الإلكتروني أطول من المسموح.',
    taken: 'لهذا البريد حساب بالفعل. سجّلي الدخول به بدلًا من إنشاء حساب جديد.',
    wrong_credentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  },
  password: {
    required: 'كلمة المرور مطلوبة.',
    invalid: 'كلمة المرور غير صالحة.',
    too_short: 'كلمة المرور قصيرة: ٨ أحرف على الأقل.',
    too_long: 'كلمة المرور أطول من المسموح.',
    wrong_password: 'كلمة المرور غير صحيحة.',
  },
};

export const PHOTO_MESSAGES: Record<string, string> = {
  too_large: 'الصورة أكبر من المسموح. صغّريها إلى ٥ ميغابايت أو أقل ثم اختاريها من جديد.',
  too_many_pixels: 'أبعاد الصورة كبيرة جدًا. اختاري صورة أصغر.',
  invalid: 'تعذّر قبول هذه الصورة. اختاري صورة JPEG أو PNG أو WebP.',
  required: 'اختاري صورة أولًا.',
};

export const NETWORK_MESSAGE = 'تعذّر الاتصال. تحققي من الاتصال ثم حاولي مرة أخرى.';
export const TRY_LATER_MESSAGE = 'تعذّر إتمام ذلك الآن. حاولي مرة أخرى بعد لحظات.';
export const SUSPENDED_MESSAGE = 'لا يمكن لهذا الحساب إرسال إعلانات جديدة.';

/** "بعد ٣ ساعات" from seconds. */
function inHours(seconds: number): string {
  const hours = Math.max(1, Math.ceil(seconds / 3600));
  return hours === 1 ? 'بعد ساعة' : hours === 2 ? 'بعد ساعتين' : `بعد ${toArabicDigits(hours)} ساعات`;
}

/** The one line to show for a failure that is not about a single field. */
export function failureMessage(res: Extract<ApiResult<unknown>, { ok: false }>): string {
  if (res.error === 'network') return NETWORK_MESSAGE;
  if (res.error === 'posting_limit') return `أرسلتِ ٥ إعلانات خلال آخر ٢٤ ساعة، وهو الحد. يمكنكِ إرسال إعلان جديد ${inHours(res.retryAfter ?? 3600)}.`;
  if (res.error === 'too_many_attempts') return `محاولات كثيرة. حاولي مرة أخرى ${res.retryAfter && res.retryAfter < 120 ? 'بعد دقيقة' : inHours(res.retryAfter ?? 3600)}.`;
  if (res.error === 'account_suspended') return SUSPENDED_MESSAGE;
  return TRY_LATER_MESSAGE;
}
