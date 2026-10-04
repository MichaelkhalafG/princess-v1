// What a search should find beyond the listing's own words: the categories she named.
// "أظافر" or "اظافر" typed into the search finds the nails listings even when none of them
// uses the word.
import { CATEGORIES, type CategorySlug } from './constants.ts';

/**
 * Arabic spelling, folded so the same word typed differently compares equal: no
 * diacritics or tatweel, every alef form as ا, ى as ي, ة as ه, lower case for Latin.
 */
export function foldArabic(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // tashkeel, superscript alef, tatweel
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // آ أ إ ٱ → ا
    .replace(/\u0649/g, '\u064A') // ى → ي
    .replace(/\u0629/g, '\u0647') // ة → ه
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
