import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES } from '../../lib/constants.ts';
import {
  areaText, charsLabel, charsOverLabel, contactLinks, digitsLabel, formatPhone, listingCountLabel,
  pricePlaceholder, relativeDate, toArabicDigits,
} from '../../lib/format.ts';

test('listingCountLabel: the decided boundaries', () => {
  assert.equal(listingCountLabel(0), 'لا نتائج');
  assert.equal(listingCountLabel(1), 'إعلان واحد');
  assert.equal(listingCountLabel(2), 'إعلانان');
  assert.equal(listingCountLabel(3), '٣ إعلانات');
  assert.equal(listingCountLabel(10), '١٠ إعلانات');
  assert.equal(listingCountLabel(11), '١١ إعلانًا');
  assert.equal(listingCountLabel(100), '١٠٠ إعلان');
});

test('listingCountLabel: past 100 the form follows n % 100', () => {
  assert.equal(listingCountLabel(99), '٩٩ إعلانًا');
  assert.equal(listingCountLabel(101), '١٠١ إعلان');
  assert.equal(listingCountLabel(102), '١٠٢ إعلان');
  assert.equal(listingCountLabel(103), '١٠٣ إعلانات');
  assert.equal(listingCountLabel(111), '١١١ إعلانًا');
  assert.equal(listingCountLabel(1000), '١٠٠٠ إعلان');
});

test('listingCountLabel agrees with CLDR Arabic plural categories for 0..2000', () => {
  const rules = new Intl.PluralRules('ar');
  const expectedSuffix: Record<string, string> = { few: 'إعلانات', many: 'إعلانًا', other: 'إعلان' };
  for (let n = 3; n <= 2000; n++) {
    const cat = rules.select(n);
    assert.ok(cat in expectedSuffix, `unexpected category ${cat} for ${n}`);
    assert.equal(listingCountLabel(n), `${toArabicDigits(n)} ${expectedSuffix[cat]}`, `n=${n}`);
  }
});

test('the form messages agree at the boundaries 1, 2, 3, 10, 11, 100', () => {
  assert.deepEqual([1, 2, 3, 10, 11, 100].map(charsOverLabel),
    ['بحرف واحد', 'بحرفين', 'بـ ٣ أحرف', 'بـ ١٠ أحرف', 'بـ ١١ حرفًا', 'بـ ١٠٠ حرف']);
  assert.deepEqual([1, 2, 3, 10, 11, 100].map(digitsLabel),
    ['رقمًا واحدًا', 'رقمين', '٣ أرقام', '١٠ أرقام', '١١ رقمًا', '١٠٠ رقم']);
  // the design wrote "٦٠٠ حرفًا" for the description limit; 600 takes the genitive singular
  assert.equal(charsLabel(600), '٦٠٠ حرف');
  assert.equal(charsLabel(60), '٦٠ حرفًا');
});

test('formatPhone groups the national number after the dialling code', () => {
  for (const k of COUNTRIES) {
    const shown = formatPhone(`${k.dialCode}${k.phone.example}`);
    assert.ok(shown.startsWith(`${k.dialCode} `), shown);
    assert.equal(shown.replace(/\s/g, ''), `${k.dialCode}${k.phone.example}`);
    assert.ok(shown.split(' ').length >= 3, shown);
  }
  assert.equal(formatPhone('+15551234567'), '+15551234567');
});

test('listingCountLabel refuses a nonsense count', () => {
  assert.throws(() => listingCountLabel(-1), RangeError);
  assert.throws(() => listingCountLabel(1.5), RangeError);
});

test('relativeDate is computed from the injected clock, in Arabic-Indic digits', () => {
  const now = new Date('2026-05-10T12:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const H = 3_600_000;
  const D = 24 * H;
  // the design's own samples
  assert.equal(relativeDate(ago(H), now), 'قبل ساعة');
  assert.equal(relativeDate(ago(2 * H), now), 'قبل ساعتين');
  assert.equal(relativeDate(ago(3 * H), now), 'قبل ٣ ساعات');
  assert.equal(relativeDate(ago(D), now), 'أمس');
  assert.equal(relativeDate(ago(2 * D), now), 'قبل يومين');
  assert.equal(relativeDate(ago(3 * D), now), 'قبل ٣ أيام');
  // the result really depends on the age — not a constant
  assert.notEqual(relativeDate(ago(5 * 60_000), now), relativeDate(ago(5 * H), now));
});

test('areaText joins city and district with an Arabic comma, or shows the city alone', () => {
  assert.equal(areaText('القاهرة', 'مدينة نصر'), 'القاهرة، مدينة نصر');
  assert.equal(areaText('القاهرة', null), 'القاهرة');
});

test('pricePlaceholder follows the country currency and differs per country', () => {
  const placeholders = COUNTRIES.map((c) => pricePlaceholder(c.code));
  COUNTRIES.forEach((c, i) => {
    assert.ok(placeholders[i].startsWith('مثال: ٥٠ '));
    assert.ok(placeholders[i].endsWith(c.currency));
  });
  assert.equal(new Set(placeholders).size, COUNTRIES.length);
});

test('contactLinks: WhatsApp first; without it the first given method leads', () => {
  const all = contactLinks({ whatsapp: '+201001234567', phone: '+201001234568', social: 'mona.nails' });
  assert.deepEqual(all.map((c) => c.kind), ['whatsapp', 'phone', 'social']);
  assert.equal(all[0].href, 'https://wa.me/201001234567');
  assert.equal(all[1].href, 'tel:+201001234568');
  assert.equal(all[2].href, 'https://www.instagram.com/mona.nails/');

  const noWhatsapp = contactLinks({ whatsapp: null, phone: '+966501234567', social: 'reem' });
  assert.deepEqual(noWhatsapp.map((c) => c.kind), ['phone', 'social']);

  const instaOnly = contactLinks({ whatsapp: null, phone: null, social: 'reem' });
  assert.deepEqual(instaOnly.map((c) => c.kind), ['social']);
});
