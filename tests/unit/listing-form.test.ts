import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, COUNTRIES, LIMITS, PHOTO_MAX_BYTES } from '../../lib/constants.ts';
import { toArabicDigits } from '../../lib/format.ts';
import { validateListing } from '../../lib/listing.ts';
import {
  CONTACTS_MISSING_MESSAGE, counter, emptyForm, hasAnyContact, hasValidContact, parsePhone, submitGate, toPayload, validateForm,
  type FormValues,
} from '../../lib/listing-form.ts';
import { checkPhoto } from '../../lib/upload.ts';

const K = COUNTRIES[0];

// Built here, field by field, for every test.
function filled(over: Partial<FormValues> = {}): FormValues {
  return {
    ...emptyForm(K.code),
    name: 'اسم', title: 'عنوان', category: CATEGORIES[0].slug, city: 'مدينة', description: 'وصف',
    whatsapp: K.phone.example,
    ...over,
  };
}

test('submit is blocked, with the reason on it, while all three contacts are blank', () => {
  const blank = filled({ whatsapp: '', phone: '', social: '' });
  const g = submitGate(blank, 'idle', null);
  assert.equal(g.blocked, true);
  assert.equal(g.reason, 'contacts');
  assert.match(g.label, /طريقة تواصل/);
  // whitespace is still blank
  assert.equal(submitGate(filled({ whatsapp: '  ', phone: '\t', social: ' ' }), 'idle', null).reason, 'contacts');
});

test('any one contact unblocks submit — each of the three on its own', () => {
  for (const only of [{ whatsapp: K.phone.example }, { phone: K.phone.example }, { social: 'mona.nails' }]) {
    const v = filled({ whatsapp: '', phone: '', social: '', ...only });
    assert.ok(hasAnyContact(v));
    const g = submitGate(v, 'idle', null);
    assert.equal(g.blocked, false, JSON.stringify(only));
    assert.equal(g.label, 'انشري الإعلان');
  }
});

test('submit is blocked while the photo is prepared, while it uploads (with its progress) and while publishing', () => {
  assert.equal(submitGate(filled(), 'preparing', null).reason, 'preparing');
  assert.equal(submitGate(filled(), 'chosen', null).blocked, false);
  const up = submitGate(filled(), 'chosen', { uploading: 46 });
  assert.equal(up.reason, 'uploading');
  assert.ok(up.label.includes('٤٦٪'), up.label);
  assert.equal(submitGate(filled(), 'chosen', 'publishing').reason, 'submitting');
});

test('the form and the server agree: a blocked-contacts form is refused by the server too', () => {
  const blank = filled({ whatsapp: '', phone: '', social: '' });
  assert.equal(validateForm(blank).contacts, CONTACTS_MISSING_MESSAGE);
  const server = validateListing(toPayload(blank, null));
  assert.equal(server.ok, false);
  assert.equal(!server.ok && server.errors.contact, 'contact_required');
});

test('a form that passes its own checks produces a payload the server accepts, for every country', () => {
  for (const k of COUNTRIES) {
    const v = filled({ country: k.code, whatsapp: k.phone.example, phone: `0${k.phone.example}`, social: '@mona.nails', price: 'حسب الطلب' });
    assert.deepEqual(validateForm(v), {});
    const server = validateListing(toPayload(v, null));
    assert.ok(server.ok, `${k.code}: ${JSON.stringify(!server.ok && server.errors)}`);
    assert.equal(server.value.whatsapp, `${k.dialCode}${k.phone.example}`);
    assert.equal(server.value.phone, `${k.dialCode}${k.phone.example}`, 'leading zero dropped');
    assert.equal(server.value.social, 'mona.nails');
    assert.equal(server.value.price, 'حسب الطلب', 'price is passed through untouched — no currency appended');
  }
});

test('parsePhone follows the country: length and first digit, Arabic-Indic digits accepted', () => {
  for (const k of COUNTRIES) {
    assert.deepEqual(parsePhone(k.phone.example, k.code, 'whatsapp'), { kind: 'ok', e164: `${k.dialCode}${k.phone.example}` });
    const arabic = k.phone.example.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
    assert.equal(parsePhone(arabic, k.code, 'whatsapp').kind, 'ok');
    assert.equal(parsePhone(k.phone.example.slice(0, -1), k.code, 'phone').kind, 'error');
    assert.equal(parsePhone(`${k.phone.example}9`, k.code, 'phone').kind, 'error');
    assert.equal(parsePhone('12ab', k.code, 'phone').kind, 'error');
    assert.equal(parsePhone('  ', k.code, 'phone').kind, 'empty');
  }
});

test('counter text and over-limit flag', () => {
  assert.deepEqual(counter('name', ''), { text: `٠ / ${toArabicDigits(LIMITS.name)}`, over: false });
  assert.equal(counter('price', 'ب'.repeat(LIMITS.price)).over, false);
  assert.equal(counter('price', 'ب'.repeat(LIMITS.price + 1)).over, true);
});

test('too-long messages use correct Arabic agreement', () => {
  const e = validateForm(filled({ name: 'ب'.repeat(LIMITS.name + 1), description: 'ب'.repeat(LIMITS.description + 11) }));
  // 11–99 takes the singular accusative (حرفًا); the limit must stay in that range for this wording
  assert.ok(LIMITS.name >= 11 && LIMITS.name <= 99);
  assert.equal(e.name, `الاسم أطول من المسموح بحرف واحد. اختصريه إلى ${toArabicDigits(LIMITS.name)} حرفًا.`);
  assert.equal(e.description, 'الوصف أطول من المسموح بـ ١١ حرفًا. اختصريه إلى ٦٠٠ حرف.');
});

test('required fields and the city message use the selected country', () => {
  for (const k of COUNTRIES) {
    const e = validateForm({ ...emptyForm(k.code), whatsapp: k.phone.example });
    assert.ok(e.name && e.title && e.description && e.category && e.city);
    assert.ok(e.city!.includes(k.cityExample));
    assert.equal(e.contacts, undefined);
  }
});

test('checkPhoto: the design refusals, before any upload', () => {
  assert.equal(checkPhoto({ type: 'image/png', size: PHOTO_MAX_BYTES }).ok, true);
  const big = checkPhoto({ type: 'image/jpeg', size: PHOTO_MAX_BYTES + 1 });
  assert.equal(big.ok, false);
  assert.match(!big.ok ? big.reason : '', /أكبر من المسموح \(٥٫٠ ميغابايت\)/);
  const gif = checkPhoto({ type: 'image/gif', size: 10 });
  assert.match(!gif.ok ? gif.reason : '', /من نوع GIF/);
  const none = checkPhoto({ type: '', size: 10 });
  assert.match(!none.ok ? none.reason : '', /ليس صورة/);
});

test('the contacts pill is green only for a contact that will be accepted', () => {
  for (const k of COUNTRIES) {
    const base = { ...emptyForm(k.code) };
    assert.equal(hasValidContact(base), false, `${k.code}: nothing typed`);
    assert.equal(hasValidContact({ ...base, whatsapp: k.phone.example.slice(0, -2) }), false, `${k.code}: half a number`);
    assert.equal(hasValidContact({ ...base, whatsapp: k.phone.example }), true, `${k.code}: a complete WhatsApp number`);
    assert.equal(hasValidContact({ ...base, phone: k.phone.example }), true, `${k.code}: a complete phone number`);
  }
  const eg = emptyForm(COUNTRIES[0].code);
  assert.equal(hasValidContact({ ...eg, social: 'mona.nails' }), true);
  assert.equal(hasValidContact({ ...eg, social: '@mona.nails' }), true);
  assert.equal(hasValidContact({ ...eg, social: 'instagram.com/mona' }), false, 'a link is not a handle');
  // a half number beside a valid handle: the handle counts
  assert.equal(hasValidContact({ ...eg, whatsapp: '10', social: 'mona.nails' }), true);
});
