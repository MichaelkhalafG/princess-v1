// Renders the real pages (next dev) against the LOCAL Supabase and asserts on their HTML.
// This proves what the server renders — not how it looks. Every listing used here is
// created by this file and deleted in after(), and the dev server is stopped and its
// port checked free.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { createClient } from '@supabase/supabase-js';
import { CATEGORIES, COUNTRIES } from '../../lib/constants.ts';
import { areaText, formatPhone } from '../../lib/format.ts';
import { testEnv } from '../support/env.ts';

const { url, publishableKey, secretKey } = testEnv();

const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const RUN = `p${randomUUID().slice(0, 8)}`;
const K = COUNTRIES[0];
const num = `${K.dialCode}${K.phone.example}`;
// Two categories the run owns alone in this country: derived, not named.
const [CAT_SHARED, CAT_ALONE] = [CATEGORIES[CATEGORIES.length - 1].slug, CATEGORIES[CATEGORIES.length - 2].slug];

let server: ChildProcess | undefined;
let base = '';
const ids: Record<string, string> = {};

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as { port: number };
      s.close(() => resolve(port));
    });
    s.on('error', reject);
  });
}

async function insert(row: Record<string, unknown>): Promise<string> {
  const { data, error } = await admin.from('listings').insert({
    name: 'اختبار', title: `عنوان ${RUN}`, category: CAT_SHARED, country: K.code, city: `مدينة-${RUN}`,
    description: `وصف ${RUN}`, ...row,
  }).select('id').single();
  if (error) throw error;
  return data.id;
}

async function get(path: string): Promise<{ status: number; html: string }> {
  const res = await fetch(`${base}${path}`, { redirect: 'manual' });
  return { status: res.status, html: await res.text() };
}

before(async () => {
  await admin.from('listings').delete().like('search_text', `%${RUN}%`);
  ids.withAll = await insert({ district: `حي-${RUN}`, whatsapp: num, phone: num, social: 'mona.nails', price: 'حسب الطلب' });
  ids.noWhatsapp = await insert({ phone: num, social: 'reem.henna' });
  ids.alone = await insert({ category: CAT_ALONE, social: 'only.one' });
  // the shared category must hold only this run's rows for the "others" assertions
  const { count } = await admin.from('listings').select('id', { count: 'exact', head: true }).eq('country', K.code).eq('category', CAT_ALONE);
  assert.equal(count, 1, `category ${CAT_ALONE} in ${K.code} is not empty before the test; cannot assert the "alone" state`);

  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', String(port), '-H', '127.0.0.1'], {
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: 'ignore',
  });
  for (let i = 0; i < 240; i++) {
    try {
      if ((await fetch(`${base}/new`)).status === 200) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('next dev did not come up in 240s');
});

after(async () => {
  await admin.from('listings').delete().like('search_text', `%${RUN}%`);
  const { count } = await admin.from('listings').select('id', { count: 'exact', head: true }).like('search_text', `%${RUN}%`);
  assert.equal(count, 0, 'test rows left behind');
  if (server?.pid) {
    // the dev server spawns workers: end the whole tree (taskkill exists on Windows)
    if (process.platform === 'win32') execFileSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
    else server.kill('SIGTERM');
  }
  await new Promise((r) => setTimeout(r, 1000));
  const stillUp = await fetch(`${base}/new`).then(() => true, () => false);
  assert.equal(stillUp, false, 'dev server still answering after shutdown');
});

test('detail page: city and district together, price as typed, WhatsApp first', async () => {
  const { status, html } = await get(`/listing/${ids.withAll}`);
  assert.equal(status, 200);
  assert.ok(html.includes(areaText(`مدينة-${RUN}`, `حي-${RUN}`)), 'city، district missing');
  assert.ok(html.includes('حسب الطلب'), 'price text missing');
  const wa = html.indexOf('https://wa.me/');
  const tel = html.indexOf(`tel:${num}`);
  const ig = html.indexOf('https://www.instagram.com/mona.nails/');
  assert.ok(wa > 0 && tel > wa && ig > tel, 'contact order must be WhatsApp, call, Instagram');
  assert.ok(html.includes(formatPhone(num)), 'formatted number missing');
  assert.ok(!html.includes('إعلانك الآن على اللوحة'), 'the posted banner must not show without ?posted=1');
});

test('detail page: without WhatsApp the first contact she gave is the main button', async () => {
  const { status, html } = await get(`/listing/${ids.noWhatsapp}`);
  assert.equal(status, 200);
  assert.ok(!html.includes('https://wa.me/'));
  const tel = html.indexOf(`tel:${num}`);
  const ig = html.indexOf('https://www.instagram.com/reem.henna/');
  assert.ok(tel > 0 && ig > tel, 'call must lead, Instagram second');
  // the main button is the contact variant, with its dot, whatever the method
  const mainAnchor = html.slice(html.lastIndexOf('<a', tel), tel);
  assert.match(mainAnchor, /class="[^"]*contact/);
});

test('?posted=1 shows the live confirmation', async () => {
  const { html } = await get(`/listing/${ids.withAll}?posted=1`);
  assert.ok(html.includes('إعلانك الآن على اللوحة'));
  assert.ok(html.includes(`يظهر لكل سيدة في ${K.name}`));
});

test('others row lists the other listing in the same country and category, and only it', async () => {
  const { html } = await get(`/listing/${ids.withAll}`);
  assert.ok(html.includes(`href="/listing/${ids.noWhatsapp}"`));
  assert.ok(!html.includes(`href="/listing/${ids.alone}"`), 'a listing from another category leaked in');
  assert.ok(!html.includes(`href="/listing/${ids.withAll}"`), 'the listing must not list itself');
});

test('a listing alone in its category shows the "only one" note instead', async () => {
  const { html } = await get(`/listing/${ids.alone}`);
  assert.ok(html.includes('هذا الإعلان الوحيد في'));
  assert.ok(!html.includes('إعلانات أخرى في'));
});

test('unknown and malformed ids are 404 with the not-found panel', async () => {
  for (const id of [randomUUID(), 'not-a-uuid']) {
    const { status, html } = await get(`/listing/${id}`);
    assert.equal(status, 404, id);
    assert.ok(html.includes('هذا الإعلان لم يعد على اللوحة'), id);
  }
});

test('form page: submit starts blocked, with the contact reason on it', async () => {
  const { status, html } = await get('/new');
  assert.equal(status, 200);
  const btn = html.match(/<button[^>]*type="submit"[^>]*>([\s\S]*?)<\/button>/);
  assert.ok(btn, 'submit button not found');
  assert.match(btn[0], /aria-disabled="true"/);
  assert.match(btn[1], /أضيفي طريقة تواصل لتنشري الإعلان/);
  assert.ok(html.includes('أضيفي طريقة تواصل واحدة على الأقل'), 'requirement line missing');
  assert.ok(html.includes(`مثال: ٥٠ ${K.currency}`), 'price placeholder for the default country');
});

test('form page: ?country= changes the currency hint and the dialling code', async () => {
  for (const k of COUNTRIES) {
    const { html } = await get(`/new?country=${k.code}`);
    assert.ok(html.includes(`مثال: ٥٠ ${k.currency}`), k.code);
    assert.ok(html.includes(k.dialCode), k.code);
  }
});
