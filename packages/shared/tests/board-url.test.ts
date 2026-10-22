import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, COUNTRIES } from '../../lib/constants.ts';
import { MAX_QUERY, MAX_SHOWN, PAGE_SIZE, boardHref, boardHrefAt, readBoardContext, shownOf, withBoardContext } from '../../lib/board-url.ts';

const K = COUNTRIES[1];
const C = CATEGORIES[2];

test('a board context survives a round trip through a listing link and back', () => {
  const ctx = { country: K.code, category: C.slug, q: 'الدمام' };
  const listing = withBoardContext('/listing/abc', ctx);
  const back = readBoardContext(new URL(listing, 'http://x').searchParams);
  assert.deepEqual(back, ctx);
  const home = new URL(boardHref(back), 'http://x').searchParams;
  assert.equal(home.get('country'), K.code);
  assert.equal(home.get('category'), C.slug);
  assert.equal(home.get('q'), 'الدمام');
});

test('unknown or hostile values are dropped, and a long query is cut', () => {
  const ctx = readBoardContext({ country: 'XX', category: '<script>', q: 'ب'.repeat(MAX_QUERY + 50) });
  assert.equal(ctx.country, null);
  assert.equal(ctx.category, null);
  assert.equal(ctx.q.length, MAX_QUERY);
});

test('home falls back to the listing country, never to a hard default, when one is known', () => {
  const ctx = readBoardContext({});
  assert.equal(new URL(boardHref(ctx, K.code), 'http://x').searchParams.get('country'), K.code);
  // with nothing known at all, the board still opens on a real country
  assert.equal(new URL(boardHref(ctx), 'http://x').searchParams.get('country'), COUNTRIES[0].code);
});

test('extra params are added without losing the context', () => {
  const url = new URL(withBoardContext('/listing/abc', { country: K.code, category: null, q: '' }, { posted: '1' }), 'http://x');
  assert.equal(url.searchParams.get('country'), K.code);
  assert.equal(url.searchParams.get('posted'), '1');
  assert.equal(url.searchParams.has('category'), false);
});

test('n (how many are shown) is read only as a whole number of pages beyond the first, within the maximum', () => {
  const read = (n: string) => readBoardContext({ country: K.code, n }).shown;
  assert.equal(read(String(PAGE_SIZE * 2)), PAGE_SIZE * 2);
  assert.equal(read(String(MAX_SHOWN)), MAX_SHOWN);
  for (const bad of [String(PAGE_SIZE), String(PAGE_SIZE + 1), String(MAX_SHOWN + PAGE_SIZE), '0', '-48', '48.0', 'abc', '']) {
    assert.equal(read(bad), undefined, `n=${bad}`);
  }
});

test('the first page leaves n out of the URL; more pages keep it on every link', () => {
  const ctx = { country: K.code, category: null, q: '' };
  assert.equal(new URL(boardHref({ ...ctx, shown: PAGE_SIZE }), 'http://x').searchParams.has('n'), false);
  const more = { ...ctx, shown: PAGE_SIZE * 3 };
  assert.equal(new URL(boardHref(more), 'http://x').searchParams.get('n'), String(PAGE_SIZE * 3));
  assert.equal(readBoardContext(new URL(withBoardContext('/listing/abc', more), 'http://x').searchParams).shown, PAGE_SIZE * 3);
  assert.equal(shownOf(ctx), PAGE_SIZE);
});

test('"back" from a listing returns to its card, with as many loaded as before', () => {
  const ctx = { country: K.code, category: null, q: '', shown: PAGE_SIZE * 2 };
  const url = new URL(boardHrefAt(ctx, 'abc-123'), 'http://x');
  assert.equal(url.hash, '#l-abc-123');
  assert.equal(url.searchParams.get('n'), String(PAGE_SIZE * 2));
});
