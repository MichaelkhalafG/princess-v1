import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, getCategory } from '../../lib/constants.ts';
import { categoriesNamedIn, foldArabic } from '../../lib/search.ts';

test('folding makes the usual spelling differences compare equal', () => {
  assert.equal(foldArabic('أظافر'), foldArabic('اظافر'));
  assert.equal(foldArabic('إيمان'), foldArabic('ايمان'));
  assert.equal(foldArabic('حنّة'), foldArabic('حنه'));
  assert.equal(foldArabic('مستشفى'), foldArabic('مستشفي'));
  assert.equal(foldArabic('جـــل'), foldArabic('جل'));
  assert.equal(foldArabic('  رعاية   أطفال '), foldArabic('رعاية أطفال'));
});

test('every category is found by its own name, typed with or without hamza and diacritics', () => {
  for (const c of CATEGORIES) {
    assert.ok(categoriesNamedIn(c.label).includes(c.slug), c.label);
    const plain = c.label.replace(/[أإآ]/g, 'ا').replace(/\u0651/g, '');
    assert.ok(categoriesNamedIn(plain).includes(c.slug), plain);
  }
});

test('a search that contains a category name, or is part of one, names it', () => {
  const nails = CATEGORIES.find((c) => c.label === 'أظافر')!.slug;
  assert.deepEqual(categoriesNamedIn('أظافر جل في البيت'), [nails]);
  const care = categoriesNamedIn('رعاية');
  assert.ok(care.length >= 2 && care.every((s) => getCategory(s).label.includes('رعاية')));
});

test('short or unrelated searches name no category', () => {
  assert.deepEqual(categoriesNamedIn('حن'), []);
  assert.deepEqual(categoriesNamedIn('ساعات يد'), []);
  assert.deepEqual(categoriesNamedIn('%_'), []);
});

test('a value for a PostgREST or() filter is quoted, with backslash and quote escaped', async () => {
  const { postgrestQuote } = await import('../../lib/listings.ts');
  assert.equal(postgrestQuote('%أظافر%'), '"%أظافر%"');
  assert.equal(postgrestQuote('a,b)(c'), '"a,b)(c"');
  assert.equal(postgrestQuote('a"b'), String.raw`"a\"b"`);
  assert.equal(postgrestQuote(String.raw`x\%y`), String.raw`"x\\%y"`);
});
