// Proves the database layer against a LOCAL Supabase (npm run test:db).
// Every row and file these tests assert on is created here, tagged with a per-run marker,
// and removed in after() — even when a test fails.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CATEGORIES, COUNTRIES, LIMITS, PHOTO_BUCKET, PHOTO_MAX_BYTES } from '../../lib/constants.ts';
import { createSupabaseClient } from '../../lib/supabase.ts';
import { countListings, fetchListings, insertListing } from '../../lib/listings.ts';
import { categoriesNamedIn, foldArabic } from '../../lib/search.ts';
import { testEnv } from '../support/env.ts';

const { url, publishableKey, secretKey } = testEnv();

const anon: SupabaseClient = createSupabaseClient(url, publishableKey);
const admin: SupabaseClient = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });

const RUN = `t${randomUUID().slice(0, 8)}`;
const [CAT_A, CAT_B] = [CATEGORIES[0].slug, CATEGORIES[1].slug];
const [COUNTRY_A, COUNTRY_B] = [COUNTRIES[0].code, COUNTRIES[1].code];
const uploaded: string[] = [];

// A valid number for the row's country, derived from the shared constants.
function numberFor(code: unknown): string {
  const k = COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
  return `${k.dialCode}${k.phone.example}`;
}

function payload(over: Record<string, unknown> = {}) {
  const country = 'country' in over ? over.country : COUNTRY_A;
  return {
    name: 'اختبار',
    title: `عنوان ${RUN}`,
    category: CAT_A,
    country: COUNTRY_A,
    city: 'مدينة',
    district: null,
    description: `وصف ${RUN}`,
    whatsapp: numberFor(country),
    ...over,
  };
}

async function rowsForRun(): Promise<{ id: string; title: string }[]> {
  const { data, error } = await admin.from('listings').select('id,title').like('search_text', `%${RUN}%`);
  if (error) throw error;
  return data;
}

async function cleanup() {
  const { error } = await admin.from('listings').delete().like('search_text', `%${RUN}%`);
  if (error) throw error;
  if (uploaded.length) {
    const { error: e } = await admin.storage.from(PHOTO_BUCKET).remove(uploaded);
    if (e) throw e;
  }
}

before(cleanup);
after(async () => {
  await cleanup();
  assert.equal((await rowsForRun()).length, 0, 'test rows left behind');
  const { data } = await admin.storage.from(PHOTO_BUCKET).list('', { search: '' });
  const left = (data ?? []).filter((o) => uploaded.includes(o.name));
  assert.equal(left.length, 0, 'test photos left behind');
});

function assertCheckViolation(error: { code?: string; message?: string } | null, constraint: string) {
  assert.ok(error, `expected ${constraint} to refuse the row`);
  assert.equal(error.code, '23514', error.message ?? '');
  assert.match(error.message ?? '', new RegExp(constraint));
}

// ── CHECK constraints, hit directly (no validator in the way) ─────────────────────

test('contact CHECK refuses a listing with all three contacts blank', async () => {
  const { error } = await anon.from('listings').insert(payload({ whatsapp: null, phone: null, social: null }));
  assertCheckViolation(error, 'listings_contact_check');
  // empty strings are not a way round it
  const { error: e2 } = await anon.from('listings').insert(payload({ whatsapp: '', phone: '', social: '' }));
  assert.ok(e2, 'empty-string contacts must be refused');
  assert.equal(e2.code, '23514');
  assert.equal((await rowsForRun()).length, 0);
});

test('country CHECK refuses an unknown country', async () => {
  const { error } = await anon.from('listings').insert(payload({ country: 'XX' }));
  assertCheckViolation(error, 'listings_country_check');
});

test('category CHECK refuses a category not in the list (and the Arabic label)', async () => {
  const { error } = await anon.from('listings').insert(payload({ category: 'not-a-category' }));
  assertCheckViolation(error, 'listings_category_check');
  const { error: e2 } = await anon.from('listings').insert(payload({ category: CATEGORIES[0].label }));
  assertCheckViolation(e2, 'listings_category_check');
  assert.equal((await rowsForRun()).length, 0);
});

test('phone CHECK refuses a number from another country', async () => {
  const other = COUNTRIES.find((k) => k.code !== COUNTRY_A)!;
  const { error } = await anon.from('listings').insert(payload({ whatsapp: `${other.dialCode}${other.phone.example}` }));
  assertCheckViolation(error, 'listings_phone_country_check');
});

test('text limit CHECKs hold even without the validator', async () => {
  // every limit in LIMITS, one over; a title or description over the limit loses the run
  // tag, but the other one still carries it, so after() can still find a stray row
  for (const [field, max] of Object.entries(LIMITS)) {
    const { error } = await anon.from('listings').insert(payload({ [field]: 'ب'.repeat(max + 1) }));
    assertCheckViolation(error, `listings_${field}_check`);
  }
  assert.equal((await rowsForRun()).length, 0);
});

test('a name of exactly LIMITS.name characters is accepted', async () => {
  const { error } = await anon.from('listings').insert(payload({ name: 'ب'.repeat(LIMITS.name) }));
  assert.equal(error, null, error?.message ?? '');
  assert.equal((await rowsForRun()).length, 1);
  await cleanup(); // later tests count this run's rows from zero
});

// ── Column grants ─────────────────────────────────────────────────────────────────

test('column grants stop the anon client setting id or created_at', async () => {
  const { error: e1 } = await anon.from('listings').insert(payload({ id: randomUUID() }));
  assert.ok(e1, 'setting id must be refused');
  assert.equal(e1.code, '42501', e1.message);
  const { error: e2 } = await anon.from('listings').insert(payload({ created_at: '2000-01-01T00:00:00Z' }));
  assert.ok(e2, 'setting created_at must be refused');
  assert.equal(e2.code, '42501', e2.message);
  assert.equal((await rowsForRun()).length, 0, 'a refused insert must leave no row');
});

// ── Row-level security ────────────────────────────────────────────────────────────

test('RLS: anon can insert and read, but cannot update or delete', async () => {
  const { data: inserted, error } = await anon.from('listings').insert(payload()).select('id,title').single();
  assert.ifError(error);
  const id = inserted!.id;

  const { data: read, error: re } = await anon.from('listings').select('id,title').eq('id', id);
  assert.ifError(re);
  assert.equal(read!.length, 1);

  const { data: upd, error: ue } = await anon.from('listings').update({ title: `hacked ${RUN}` }).eq('id', id).select();
  assert.ok(ue || upd!.length === 0, 'update must be refused');
  const { error: de, count } = await anon.from('listings').delete({ count: 'exact' }).eq('id', id);
  assert.ok(de || count === 0, 'delete must be refused');

  // the end state is what matters: the row is still there, unchanged
  const { data: after_, error: ae } = await admin.from('listings').select('title').eq('id', id).single();
  assert.ifError(ae);
  assert.equal(after_!.title, inserted!.title);
});

// ── Filters: each must change the result set ──────────────────────────────────────

test('country, category and search each narrow the result set, and every row matches', async () => {
  const seeds = [
    payload({ country: COUNTRY_A, category: CAT_A }),
    payload({ country: COUNTRY_A, category: CAT_B }),
    payload({ country: COUNTRY_A, category: CAT_A, title: `خاص ${RUN}abcx` }),
    payload({ country: COUNTRY_B, category: CAT_A }),
    payload({ country: COUNTRY_A, category: CAT_B, title: 'بلا علامة', description: 'بلا علامة', city: `مدينة-${RUN}city` }),
    payload({ country: COUNTRY_A, category: CAT_B, title: 'بلا علامة', description: 'بلا علامة', district: `حي-${RUN}dist` }),
  ];
  for (const s of seeds) {
    const r = await insertListing(anon, s);
    assert.ok(r.ok, JSON.stringify(r));
  }

  // country
  const inA = await fetchListings(anon, { country: COUNTRY_A, q: RUN });
  const inB = await fetchListings(anon, { country: COUNTRY_B, q: RUN });
  assert.ok(inA.length > 0 && inB.length > 0);
  assert.ok(inA.every((l) => l.country === COUNTRY_A));
  assert.ok(inB.every((l) => l.country === COUNTRY_B));
  assert.equal(inA.length + inB.length, (await rowsForRun()).length, 'the two countries partition the run');

  // category
  const catA = await fetchListings(anon, { country: COUNTRY_A, category: CAT_A, q: RUN });
  assert.ok(catA.length > 0 && catA.length < inA.length, 'category filter must narrow');
  assert.ok(catA.every((l) => l.category === CAT_A));

  // search: narrower than the run, and matching on city and district alone
  const special = await fetchListings(anon, { country: COUNTRY_A, q: `${RUN}abcx` });
  assert.equal(special.length, 1);
  assert.ok(special.length < inA.length);
  const byCity = await fetchListings(anon, { country: COUNTRY_A, q: `${RUN}city` });
  assert.equal(byCity.length, 1, 'search must find a listing by its city');
  assert.ok(byCity[0].city.includes(`${RUN}city`));
  const byDistrict = await fetchListings(anon, { country: COUNTRY_A, q: `${RUN}dist` });
  assert.equal(byDistrict.length, 1, 'search must find a listing by its district');
  assert.ok(byDistrict[0].district!.includes(`${RUN}dist`));

  // search text is literal: "%" and "_" are not wildcards
  assert.equal((await fetchListings(anon, { country: COUNTRY_A, q: `${RUN}%x` })).length, 0);
  assert.equal((await fetchListings(anon, { country: COUNTRY_A, q: `${RUN}a_cx` })).length, 0);

  // order: newest first
  const times = inA.map((l) => Date.parse(l.created_at));
  assert.ok(times.every((t, i) => i === 0 || times[i - 1] >= t));
});

test('a search that names a category finds its listings, whatever their words', async () => {
  // a category whose name has a hamza, so the "typed without it" case is real
  const cat = CATEGORIES.find((c) => /[أإآ]/.test(c.label))!;
  const r = await insertListing(anon, payload({ category: cat.slug, title: `عنوان ${RUN}`, description: `وصف ${RUN}` }));
  assert.ok(r.ok, JSON.stringify(r));
  const id = r.ok ? r.listing.id : '';
  assert.ok(!`${r.ok && r.listing.title} ${r.ok && r.listing.description}`.includes(cat.label), 'the listing text must not contain the name');

  const has = async (q: string) => (await fetchListings(anon, { country: COUNTRY_A, q })).some((l) => l.id === id);
  assert.ok(await has(cat.label), 'its category name');
  assert.ok(await has(cat.label.replace(/[أإآ]/g, 'ا')), 'its category name without the hamza');
  const other = CATEGORIES.find((c) => c.slug !== cat.slug && !categoriesNamedIn(c.label).includes(cat.slug))!;
  assert.ok(!(await has(other.label)), 'another category name does not find it');
  // what she types goes into the filter quoted: quotes, commas and brackets cannot break it
  assert.ok(await has(`${cat.label}",x)(`), 'odd characters around a category name');
});

test('a search finds a listing however its words are spelled (the fold migration)', async () => {
  // written with the spellings a search often does not repeat: ة, a hamza on the alef
  const written = { city: 'القاهرة', district: 'مدينة نصر', title: `إطلالة ${RUN}` };
  const r = await insertListing(anon, payload(written));
  assert.ok(r.ok, JSON.stringify(r));
  const id = r.ok ? r.listing.id : '';
  const has = async (q: string) => (await fetchListings(anon, { country: COUNTRY_A, q })).some((l) => l.id === id);

  for (const word of [written.city, written.district, 'إطلالة']) {
    const typed = foldArabic(word);
    assert.notEqual(typed, word, `the folded form of ${word} must differ, or this proves nothing`);
    assert.deepEqual(categoriesNamedIn(typed), [], `${typed} must not name a category, or a category match could pass it`);
    assert.ok(await has(word), `as written: ${word}`);
    assert.ok(await has(typed), `folded: ${typed}`);
  }
});

test('a limit returns the newest N; the count is all that match the same filters', async () => {
  const tag = `${RUN}page`;
  for (let i = 0; i < 5; i++) assert.ok((await insertListing(anon, payload({ title: `عنوان ${tag} ${i}` }))).ok);
  const f = { country: COUNTRY_A, q: tag };
  const all = await fetchListings(anon, f);
  assert.equal(all.length, 5);
  const firstTwo = await fetchListings(anon, { ...f, limit: 2 });
  assert.deepEqual(firstTwo.map((l) => l.id), all.slice(0, 2).map((l) => l.id), 'the limit takes the newest, in the same order');
  assert.equal(await countListings(anon, f), 5, 'the count ignores the limit');
  assert.equal(await countListings(anon, { ...f, category: CAT_B }), 0, 'the count applies the same filters');
});

test('insertListing never sends an invalid payload', async () => {
  const r = await insertListing(anon, payload({ whatsapp: null }));
  assert.equal(r.ok, false);
  assert.ok('errors' in r && r.errors.contact === 'contact_required');
});

// ── Photo bucket ──────────────────────────────────────────────────────────────────

// 1×1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

async function anonUpload(name: string, body: Buffer, contentType: string, upsert = false) {
  const res = await anon.storage.from(PHOTO_BUCKET).upload(name, body, { contentType, upsert });
  if (!res.error) uploaded.push(name);
  return res;
}

test('bucket: anon can upload a small image under a uuid name', async () => {
  const name = `${randomUUID()}.png`;
  const { error } = await anonUpload(name, PNG, 'image/png');
  assert.ifError(error);
  const pub = anon.storage.from(PHOTO_BUCKET).getPublicUrl(name).data.publicUrl;
  const res = await fetch(pub);
  assert.equal(res.status, 200);
  assert.equal(Buffer.from(await res.arrayBuffer()).length, PNG.length);
});

test('bucket: refuses a non-image type, an oversize file, and a non-uuid name', async () => {
  const { error: typeErr } = await anonUpload(`${randomUUID()}.png`, Buffer.from('hello'), 'text/plain');
  assert.ok(typeErr, 'text/plain must be refused');
  const { error: sizeErr } = await anonUpload(`${randomUUID()}.png`, Buffer.alloc(PHOTO_MAX_BYTES + 1), 'image/png');
  assert.ok(sizeErr, 'a file over the limit must be refused');
  const { error: nameErr } = await anonUpload(`../${RUN}.png`, PNG, 'image/png');
  assert.ok(nameErr, 'a name outside the uuid pattern must be refused');
  const { error: nameErr2 } = await anonUpload(`${RUN}.png`, PNG, 'image/png');
  assert.ok(nameErr2, 'a name outside the uuid pattern must be refused');
});

test('bucket: anon cannot overwrite or delete an existing photo', async () => {
  const name = `${randomUUID()}.png`;
  assert.ifError((await anonUpload(name, PNG, 'image/png')).error);
  const { error: overErr } = await anon.storage.from(PHOTO_BUCKET).upload(name, Buffer.alloc(10), { contentType: 'image/png', upsert: true });
  assert.ok(overErr, 'overwrite must be refused');
  await anon.storage.from(PHOTO_BUCKET).remove([name]);
  // end state: the original bytes are still there
  const { data, error } = await admin.storage.from(PHOTO_BUCKET).download(name);
  assert.ifError(error);
  assert.equal(Buffer.from(await data!.arrayBuffer()).length, PNG.length);
});
