import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, COUNTRIES, LIMITS } from '../../lib/constants.ts';
import { validateListing, WRITABLE_COLUMNS, type ValidationResult } from '../../lib/listing.ts';

// A valid number for a country, derived from the shared constants.
const num = (k: (typeof COUNTRIES)[number]) => `${k.dialCode}${k.phone.example}`;

// Every test builds its own payload from this function; nothing comes from a database.
function valid(): Record<string, unknown> {
  return {
    name: 'اسم',
    title: 'عنوان',
    category: CATEGORIES[0].slug,
    country: COUNTRIES[0].code,
    city: 'مدينة',
    description: 'وصف',
    whatsapp: num(COUNTRIES[0]),
  };
}

function errorsOf(r: ValidationResult) {
  assert.equal(r.ok, false, 'expected the payload to be refused');
  return (r as Extract<ValidationResult, { ok: false }>).errors;
}

test('a minimal valid payload passes, with every optional field null', () => {
  const r = validateListing(valid());
  assert.ok(r.ok);
  assert.equal(r.value.price, null);
  assert.equal(r.value.district, null);
  assert.equal(r.value.photo, null);
});

test('unknown fields are dropped, not passed through', () => {
  const r = validateListing({ ...valid(), id: 'x', created_at: '2000-01-01', search_text: 'x', is_admin: true });
  assert.ok(r.ok);
  assert.deepEqual(Object.keys(r.value).sort(), [...WRITABLE_COLUMNS].sort());
});

test('every writable column has a rule: output keys are exactly WRITABLE_COLUMNS', () => {
  const r = validateListing({ ...valid(), district: 'حي', price: 'حسب الطلب', phone: '+201001234568', social: 'a.b' });
  assert.ok(r.ok);
  for (const k of WRITABLE_COLUMNS) assert.notEqual(r.value[k], undefined, `${k} missing from output`);
});

test('all three contacts blank is refused; any single one is enough', () => {
  for (const blank of [{}, { whatsapp: '', phone: '   ', social: null }]) {
    const p = { ...valid(), whatsapp: undefined, ...blank };
    assert.equal(errorsOf(validateListing(p)).contact, 'contact_required');
  }
  for (const only of [{ whatsapp: num(COUNTRIES[0]) }, { phone: num(COUNTRIES[0]) }, { social: 'reem.henna' }]) {
    const r = validateListing({ ...valid(), whatsapp: undefined, ...only });
    assert.ok(r.ok, JSON.stringify(only));
  }
});

test('a number must belong to the listing country (dial code, length, first digit)', () => {
  for (const k of COUNTRIES) {
    assert.ok(validateListing({ ...valid(), country: k.code, whatsapp: num(k) }).ok, k.code);
    const other = COUNTRIES.find((o) => o.code !== k.code)!;
    assert.equal(errorsOf(validateListing({ ...valid(), country: k.code, whatsapp: num(other) })).whatsapp, 'invalid');
    const short = `${k.dialCode}${k.phone.example.slice(0, -1)}`;
    assert.equal(errorsOf(validateListing({ ...valid(), country: k.code, phone: short })).phone, 'invalid');
    const wrongLead = `${k.dialCode}${(Number(k.phone.lead) + 1) % 10}${k.phone.example.slice(1)}`;
    assert.equal(errorsOf(validateListing({ ...valid(), country: k.code, phone: wrongLead })).phone, 'invalid');
  }
});

test('phone numbers are normalised to E.164 and garbage is refused', () => {
  const eg = COUNTRIES.find((k) => k.code === 'EG')!;
  const r = validateListing({ ...valid(), country: eg.code, whatsapp: '٠٠٢٠ ١٠٠-١٢٣ ٤٥٦٧' });
  assert.ok(r.ok);
  assert.equal(r.value.whatsapp, '+201001234567');
  assert.equal(errorsOf(validateListing({ ...valid(), whatsapp: '01001234567' })).whatsapp, 'invalid');
  assert.equal(errorsOf(validateListing({ ...valid(), phone: 'call me' })).phone, 'invalid');
});

test('a malformed contact does not satisfy the at-least-one rule on its own', () => {
  const e = errorsOf(validateListing({ ...valid(), whatsapp: 'abc' }));
  assert.equal(e.whatsapp, 'invalid');
});

test('Instagram handle: leading @ removed; URLs and spaces refused', () => {
  const r = validateListing({ ...valid(), social: '@mona.nails' });
  assert.ok(r.ok);
  assert.equal(r.value.social, 'mona.nails');
  assert.equal(errorsOf(validateListing({ ...valid(), social: 'https://instagram.com/mona' })).social, 'invalid');
  assert.equal(errorsOf(validateListing({ ...valid(), social: 'mona nails' })).social, 'invalid');
});

test('category and country must be in the shared lists', () => {
  assert.equal(errorsOf(validateListing({ ...valid(), category: 'not-a-category' })).category, 'invalid');
  assert.equal(errorsOf(validateListing({ ...valid(), category: CATEGORIES[0].label })).category, 'invalid'); // label, not slug
  assert.equal(errorsOf(validateListing({ ...valid(), country: 'XX' })).country, 'invalid');
  assert.equal(errorsOf(validateListing({ ...valid(), country: undefined })).country, 'required');
  for (const c of CATEGORIES) assert.ok(validateListing({ ...valid(), category: c.slug }).ok, c.slug);
  for (const k of COUNTRIES) assert.ok(validateListing({ ...valid(), country: k.code, whatsapp: num(k) }).ok, k.code);
});

test('text limits: exactly at the limit passes, one over is refused (counted in code points)', () => {
  for (const [field, max] of Object.entries(LIMITS)) {
    assert.ok(validateListing({ ...valid(), [field]: 'ب'.repeat(max) }).ok, `${field} at ${max}`);
    assert.equal(errorsOf(validateListing({ ...valid(), [field]: 'ب'.repeat(max + 1) }))[field as keyof typeof LIMITS], 'too_long');
  }
  // an emoji is one code point but two UTF-16 units
  assert.ok(validateListing({ ...valid(), price: '😀'.repeat(LIMITS.price) }).ok);
});

test('price is free text kept exactly as typed (trimmed), never parsed', () => {
  for (const p of ['٥٠ للساعة', 'من ١٠٠', 'حسب الطلب', '150']) {
    const r = validateListing({ ...valid(), price: `  ${p} ` });
    assert.ok(r.ok);
    assert.equal(r.value.price, p);
  }
});

test('required text fields refuse blank and non-string values', () => {
  for (const f of ['name', 'title', 'description', 'city'] as const) {
    assert.equal(errorsOf(validateListing({ ...valid(), [f]: '   ' }))[f], 'required');
    assert.equal(errorsOf(validateListing({ ...valid(), [f]: 42 }))[f], 'invalid');
  }
});

test('photo must be a "<uuid>.<ext>" object path, never a URL', () => {
  assert.ok(validateListing({ ...valid(), photo: '0f8fad5b-d9cb-469f-a165-70867728950e.webp' }).ok);
  assert.equal(errorsOf(validateListing({ ...valid(), photo: 'https://evil.example/x.jpg' })).photo, 'invalid');
  assert.equal(errorsOf(validateListing({ ...valid(), photo: '0f8fad5b-d9cb-469f-a165-70867728950e.gif' })).photo, 'invalid');
});

test('a non-object payload is refused', () => {
  for (const p of [null, 'x', 1, []]) assert.equal(validateListing(p).ok, false);
});
