// Renders the real pages (next dev) against a LOCAL API (apps/api, on PHP's built-in server)
// over the throwaway test database, and asserts on their HTML. This proves what the server
// renders — not how it looks. The database is emptied first and last; every listing used here
// is created by this file (php artisan princess:fixtures); both servers are stopped at the end
// and their ports checked free.
//
// Needs the local MySQL (127.0.0.1, port PAGES_DB_PORT or 3316) with a princess_test database,
// and PHP on the PATH.

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { writeFileSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CATEGORIES, COUNTRIES } from '@princess/shared/constants.ts';
import { areaText, formatPhone } from '@princess/shared/format.ts';
import { REPORT_REASONS } from '@princess/shared/moderation.ts';
import { CONTACT_EMAIL, INDEXABLE } from '../../lib/site.ts';

const API_DIR = join(import.meta.dirname, '../../../api');
// Test data never touches real data: a local database whose name ends in _test, nothing else.
const DB = { DB_CONNECTION: 'mysql', DB_HOST: '127.0.0.1', DB_PORT: process.env.PAGES_DB_PORT ?? '3316', DB_DATABASE: 'princess_test', DB_USERNAME: 'root', DB_PASSWORD: '' };
assert.ok(DB.DB_HOST === '127.0.0.1' && DB.DB_DATABASE.endsWith('_test'), 'page tests run only against a local _test database');
const apiEnv = {
  ...process.env, ...DB,
  APP_ENV: 'testing', APP_DEBUG: 'false', APP_KEY: `base64:${randomBytes(32).toString('base64')}`,
  CACHE_STORE: 'array', SESSION_DRIVER: 'array', MAIL_MAILER: 'array', QUEUE_CONNECTION: 'sync',
};
const artisan = (...args: string[]) => execFileSync('php', ['artisan', ...args], { cwd: API_DIR, env: apiEnv, encoding: 'utf8' });

const RUN = `p${randomUUID().slice(0, 8)}`;
const K = COUNTRIES[0];
const num = `${K.dialCode}${K.phone.example}`;
// Two categories the run owns alone in this country: derived, not named.
const [CAT_SHARED, CAT_ALONE] = [CATEGORIES[CATEGORIES.length - 1].slug, CATEGORIES[CATEGORIES.length - 2].slug];

const servers: ChildProcess[] = [];
let base = '';
let apiBase = '';
let ids: Record<string, string> = {};

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

async function get(path: string): Promise<{ status: number; html: string }> {
  const res = await fetch(`${base}${path}`, { redirect: 'manual' });
  // React's server renderer separates adjacent text pieces ("في {country} منذ") with empty
  // <!-- --> comments; remove them so assertions compare the text a visitor actually sees.
  return { status: res.status, html: (await res.text()).replaceAll('<!-- -->', '') };
}

async function waitFor(url: string, seconds: number): Promise<void> {
  for (let i = 0; i < seconds; i++) {
    try {
      if ((await fetch(url)).status < 500) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${url} did not come up in ${seconds}s`);
}

function stop(server: ChildProcess) {
  if (!server.pid) return;
  // the servers spawn workers: end the whole tree (taskkill exists on Windows)
  if (process.platform === 'win32') execFileSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  else server.kill('SIGTERM');
}

before(async () => {
  artisan('migrate:fresh', '--force');
  const listing = (key: string, row: Record<string, unknown>) => ({
    key, name: 'اختبار', title: `عنوان ${RUN}`, category: CAT_SHARED, country: K.code, city: `مدينة-${RUN}`, description: `وصف ${RUN}`, ...row,
  });
  const file = join(tmpdir(), `princess-fixtures-${RUN}.json`);
  writeFileSync(file, JSON.stringify({ listings: [
    listing('withAll', { district: `حي-${RUN}`, whatsapp: num, phone: num, social: 'mona.nails', price: 'حسب الطلب', minutes_ago: 1 }),
    listing('noWhatsapp', { phone: num, social: 'reem.henna', minutes_ago: 2 }),
    listing('alone', { category: CAT_ALONE, social: 'only.one', minutes_ago: 3 }),
    listing('pending', { title: `قيد المراجعة ${RUN}`, social: 'waiting.one', status: 'pending', published_at: null }),
  ] }));
  try {
    ids = JSON.parse(artisan('princess:fixtures', file).trim());
  } finally {
    rmSync(file);
  }

  const apiPort = await freePort();
  apiBase = `http://127.0.0.1:${apiPort}`;
  // as `php artisan serve` runs it: from public/, with Laravel's router script
  servers.push(spawn('php', ['-S', `127.0.0.1:${apiPort}`, '../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php'], { cwd: join(API_DIR, 'public'), env: apiEnv, stdio: 'ignore' }));
  await waitFor(`${apiBase}/up`, 60);

  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  servers.push(spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '-p', String(port), '-H', '127.0.0.1'], {
    env: { ...process.env, API_URL: apiBase, NEXT_PUBLIC_API_URL: apiBase, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: 'ignore',
  }));
  await waitFor(`${base}/new`, 240);
});

after(async () => {
  for (const server of servers) stop(server);
  await new Promise((r) => setTimeout(r, 1000));
  for (const url of [`${base}/new`, `${apiBase}/up`]) {
    const stillUp = await fetch(url).then(() => true, () => false);
    assert.equal(stillUp, false, `${url} still answering after shutdown`);
  }
  artisan('migrate:fresh', '--force');
});

test('the board shows what the API publishes, newest first, and nothing that waits for review', async () => {
  const { status, html } = await get(`/?country=${K.code}`);
  assert.equal(status, 200);
  const at = (id: string) => html.indexOf(`/listing/${id}`);
  assert.ok(at(ids.withAll) > 0 && at(ids.noWhatsapp) > at(ids.withAll) && at(ids.alone) > at(ids.noWhatsapp), 'newest published first');
  assert.equal(at(ids.pending), -1, 'a listing waiting for review is not on the board');
  assert.ok(!html.includes(`قيد المراجعة ${RUN}`));
});

test('a search goes to the API, folded: a spelling she did not use still finds it', async () => {
  // "مدينه" with ه finds the city written "مدينة" with ة: the API folds both
  const { html } = await get(`/?country=${K.code}&q=${encodeURIComponent(`مدينه-${RUN}`)}`);
  assert.ok(html.includes(`/listing/${ids.withAll}`));
});

test('a listing waiting for review has no public page: not found, like one that never existed', async () => {
  const { status } = await get(`/listing/${ids.pending}`);
  assert.equal(status, 404);
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

// What the server actually sends for a missing listing. Next 16.3 does not server-render
// not-found.tsx after notFound(): it sends a 404 with an empty __next_error__ document and
// the panel is drawn in the browser (vercel/next.js#99287, open). The panel itself — its
// words and its links back with the board context — is checked in a browser, not here.
test('unknown and malformed ids are 404, noindex, and (Next bug #99287) an empty error shell', async () => {
  for (const id of [randomUUID(), 'not-a-uuid']) {
    const { status, html } = await get(`/listing/${id}`);
    assert.equal(status, 404, id);
    assert.match(html, /<meta name="robots" content="noindex"\/>/, id);
    assert.ok(html.includes('NEXT_HTTP_ERROR_FALLBACK;404'), id);
    // Tripwire: when a Next release fixes #99287 this fails — then assert the panel's
    // title ("هذا الإعلان لم يعد على اللوحة") in the HTML again instead.
    assert.match(html, /<html id="__next_error__">/, `${id}: the server rendered the page — #99287 is fixed, update this test`);
  }
});

test('form page: submit starts blocked, with the contact reason on it', async () => {
  const { status, html } = await get('/new');
  assert.equal(status, 200);
  const btn = html.match(/<button[^>]*type="submit"[^>]*>([\s\S]*?)<\/button>/);
  assert.ok(btn, 'submit button not found');
  assert.match(btn[0], /aria-disabled="true"/);
  assert.match(btn[1], /أضيفي طريقة تواصل أولًا/);
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

// ── The plain pages and the links to them ─────────────────────────────────────────

/** Every href inside the page's <footer>, entities decoded. */
function footerLinks(html: string): string[] {
  const footer = html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? '';
  return [...footer.matchAll(/href="([^"]*)"/g)].map((m) => m[1].replaceAll('&amp;', '&'));
}

test('no dead links: every footer link on every kind of page answers 200, and its #section exists', async () => {
  const pages = ['/', `/listing/${ids.withAll}`, '/new', '/about', '/privacy'];
  const seen = new Set<string>();
  for (const page of pages) {
    const { html } = await get(page);
    const links = footerLinks(html);
    assert.ok(links.length > 0, `${page}: no footer links found`);
    for (const href of links) {
      assert.ok(!href.startsWith('#'), `${page}: a link that goes nowhere (${href})`);
      if (seen.has(href)) continue;
      seen.add(href);
      const [path, hash] = href.split('#');
      const target = await get(path);
      assert.equal(target.status, 200, `${page} → ${href}`);
      if (hash) assert.ok(target.html.includes(`id="${hash}"`), `${page} → ${href}: no #${hash} on the page`);
    }
  }
});

test('the page links keep the board context she came with', async () => {
  const { html } = await get(`/about?country=${COUNTRIES[1].code}`);
  const contact = footerLinks(html).find((h) => h.endsWith('#contact'));
  assert.equal(contact, `/about?country=${COUNTRIES[1].code}#contact`);
});

test('/about: the steps in order, and #contact gives the address as a mail link and says how she removes a listing', async () => {
  const { status, html } = await get('/about');
  assert.equal(status, 200);
  const steps = ['اعرضي خدمتك', 'تظهر لكل سيدة', 'تتواصل معك مباشرة', 'بلا وسيط ولا عمولة'].map((t) => html.indexOf(`>${t}</h3>`));
  assert.ok(steps.every((i, n) => i > 0 && (n === 0 || i > steps[n - 1])), 'the four steps, in order');
  assert.ok(html.includes(`href="mailto:${CONTACT_EMAIL}"`));
  assert.ok(html.includes('تحذفين إعلاناتك بنفسك من صفحة «<a href="/my-listings">إعلاناتي</a>»'), 'and the page is a link');
});

test('an unknown address is a 404 with the Arabic page in the server HTML', async () => {
  const { status, html } = await get(`/no-such-page-${RUN}`);
  assert.equal(status, 404);
  assert.ok(html.includes('هذه الصفحة غير موجودة'));
  assert.ok(html.includes('العودة إلى اللوحة'));
});

test('terms and privacy are published: nothing on them reads as a draft, and every footer links both', async () => {
  for (const path of ['/terms', '/privacy']) {
    const { status, html } = await get(path);
    assert.equal(status, 200, path);
    const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? '';
    assert.ok(main.length > 0, `${path}: no <main>`);
    for (const mark of ['مسودة', 'للمراجعة', '[', ']']) assert.ok(!main.includes(mark), `${path}: "${mark}" on the page`);
    assert.ok(!(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '').includes('مسودة'), `${path}: draft in the title`);
  }
  for (const page of ['/', '/new', '/about']) {
    const paths = footerLinks((await get(page)).html).map((h) => h.split(/[?#]/)[0]);
    assert.ok(paths.includes('/terms') && paths.includes('/privacy'), `${page}: footer must link both`);
  }
});

test('one search-engine switch: every kind of page follows lib/site.ts INDEXABLE', async () => {
  for (const path of ['/', `/listing/${ids.withAll}`, '/new', '/about', '/terms', '/privacy']) {
    const { html } = await get(path);
    const robots = html.match(/<meta name="robots" content="([^"]*)"\/>/)?.[1];
    if (INDEXABLE) assert.equal(robots, undefined, `${path}: indexable, so no robots tag`);
    else assert.equal(robots, 'noindex, nofollow', path);
  }
});

// ── Accounts, her listings, reports (the pages render; their forms run in the browser) ─────

test('the account pages render: sign in, a forgotten password, a new password, the email link, her listings', async () => {
  const pages: [string, string][] = [
    ['/sign-in', 'تسجيل الدخول'],
    ['/forgot-password', 'نسيتِ كلمة المرور؟'],
    ['/reset-password?token=t&email=a%40b.c', 'كلمة مرور جديدة'],
    ['/verify-email?id=1&hash=h&expires=1&signature=s', 'تأكيد البريد الإلكتروني'],
    ['/my-listings', 'إعلاناتي'],
  ];
  for (const [path, title] of pages) {
    const { status, html } = await get(path);
    assert.equal(status, 200, path);
    assert.ok(html.includes(`>${title}</h1>`), `${path}: its heading`);
  }
});

test('a published listing links to its report page, which offers every reason', async () => {
  const { html } = await get(`/listing/${ids.withAll}`);
  assert.ok(html.includes(`href="/listing/${ids.withAll}/report"`), 'the report link');
  const report = await get(`/listing/${ids.withAll}/report`);
  assert.equal(report.status, 200);
  for (const reason of Object.values(REPORT_REASONS)) assert.ok(report.html.includes(`>${reason}</option>`), reason);
});

test('a listing that is not published cannot be reported', async () => {
  assert.equal((await get(`/listing/${ids.pending}/report`)).status, 404);
  assert.equal((await get(`/listing/${randomUUID()}/report`)).status, 404);
});

test('the form names its button for sending, not publishing', async () => {
  const { html } = await get('/new');
  assert.ok(!html.includes('انشري الإعلان'), 'the old label');
  assert.ok(html.includes('بإرسالك الإعلان توافقين'), 'the note under the button');
});
