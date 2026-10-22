// What a search should find beyond the listing's own words: the categories she named.
// "أظافر" or "اظافر" typed into the search finds the nails listings even when none of them
// uses the word.
import { CATEGORIES, type CategorySlug } from './constants.ts';

// The fold, as data, because the database applies the same one to the stored text
// (search_text, supabase/migrations/20261005000000_fold_search_text.sql) and
// tests/unit/schema-sync.test.ts holds the two together.
/** Letters replaced, each by the letter at the same place in FOLD_TO: آ أ إ ٱ → ا, ى → ي, ة → ه. */
export const FOLD_FROM = '\u0622\u0623\u0625\u0671\u0649\u0629';
export const FOLD_TO = '\u0627\u0627\u0627\u0627\u064A\u0647';
/** Marks removed — tashkeel, superscript alef, tatweel — as a regular-expression class. */
export const FOLD_MARKS = '[\\u064B-\\u065F\\u0670\\u0640]';

const FOLD_MAP = new Map([...FOLD_FROM].map((c, i) => [c, FOLD_TO[i]]));
const FOLD_LETTERS = new RegExp(`[${FOLD_FROM}]`, 'g');
const MARKS = new RegExp(FOLD_MARKS, 'g');

/**
 * Arabic spelling, folded so the same word typed differently compares equal: no
 * diacritics or tatweel, every alef form as ا, ى as ي, ة as ه, lower case for Latin.
 */
export function foldArabic(s: string): string {
  return s
    .normalize('NFC')
    .replace(MARKS, '')
    .replace(FOLD_LETTERS, (c) => FOLD_MAP.get(c)!)
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * The categories a search names: the search contains a category's name ("أظافر جل"), or
 * is part of one ("رعاية" → both care categories). Two letters or fewer name nothing.
 */
export function categoriesNamedIn(q: string): CategorySlug[] {
  const text = foldArabic(q);
  if ([...text].length < 3) return [];
  return CATEGORIES.filter((c) => {
    const label = foldArabic(c.label);
    return text.includes(label) || label.includes(text);
  }).map((c) => c.slug);
}
