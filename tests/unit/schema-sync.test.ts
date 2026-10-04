// The database CHECK constraints and grants must say exactly what lib/ says.
// If someone adds a category to constants.ts but not to the migration, this fails.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CATEGORY_SLUGS, COUNTRY_CODES, LIMITS, PHOTO_BUCKET, PHOTO_MAX_BYTES, PHOTO_MIME_TYPES, phonePatternSource } from '../../lib/constants.ts';
import { INSTAGRAM_PATTERN, PHONE_PATTERN, PHOTO_PATH_PATTERN, WRITABLE_COLUMNS } from '../../lib/listing.ts';

const dir = join(import.meta.dirname, '../../supabase/migrations');
const sql = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => readFileSync(join(dir, f), 'utf8')).join('\n')
  .replace(/--.*$/gm, ''); // ignore comments: only executable SQL counts

// The migrations run in order, so a constraint redefined later (alter table … add
// constraint) is the one in force: the last definition wins.
function constraintBody(name: string): string {
  const all = [...sql.matchAll(new RegExp(`constraint ${name}\\s+check \\(([\\s\\S]*?)\\)\\s*(?:,|;|\\n\\);)`, 'g'))];
  assert.ok(all.length > 0, `constraint ${name} not found in the migrations`);
  return all.at(-1)![1];
}

function quoted(s: string): string[] {
  return [...s.matchAll(/'([^']*)'/g)].map((m) => m[1]);
}

test('category CHECK lists exactly the slugs in constants.ts', () => {
  const inSql = quoted(constraintBody('listings_category_check'));
  assert.ok(inSql.length > 0);
  assert.deepEqual([...inSql].sort(), [...CATEGORY_SLUGS].sort());
});

test('country CHECK lists exactly the codes in constants.ts', () => {
  assert.deepEqual(quoted(constraintBody('listings_country_check')).sort(), [...COUNTRY_CODES].sort());
});

test('text limits in the CHECKs match LIMITS', () => {
  for (const [field, max] of Object.entries(LIMITS)) {
    const body = constraintBody(`listings_${field}_check`);
    const m = body.match(new RegExp(`char_length\\(${field}\\) <= (\\d+)`));
    assert.ok(m, `${field}: no char_length limit in SQL`);
    assert.equal(Number(m[1]), max, field);
  }
});

test('regex CHECKs are the same patterns the validator uses', () => {
  const pattern = (name: string) => quoted(constraintBody(name)).at(-1);
  assert.equal(pattern('listings_whatsapp_check'), PHONE_PATTERN.source);
  assert.equal(pattern('listings_phone_check'), PHONE_PATTERN.source);
  assert.equal(pattern('listings_social_check'), INSTAGRAM_PATTERN.source);
  assert.equal(pattern('listings_photo_check'), PHOTO_PATH_PATTERN.source);
});

test('per-country phone CHECK matches the constants for every country', () => {
  const body = constraintBody('listings_phone_country_check');
  const branches = body.split(/\n\s*or /).map((b) => b.trim());
  assert.equal(branches.length, COUNTRY_CODES.length);
  for (const code of COUNTRY_CODES) {
    const pat = phonePatternSource(code);
    const expected = `(country = '${code}' and (whatsapp is null or whatsapp ~ '${pat}') and (phone is null or phone ~ '${pat}'))`;
    assert.ok(branches.includes(expected), `missing or different branch for ${code}:\n  expected ${expected}`);
  }
});

test('contact CHECK covers all three contact columns', () => {
  assert.match(constraintBody('listings_contact_check'), /num_nonnulls\(whatsapp, phone, social\) >= 1/);
});

test('the public INSERT grant names exactly WRITABLE_COLUMNS (never id or created_at)', () => {
  const m = sql.match(/grant insert \(([^)]*)\)\s*on table public\.listings/);
  assert.ok(m, 'column-level insert grant not found');
  const cols = m[1].split(',').map((c) => c.trim());
  assert.deepEqual([...cols].sort(), [...WRITABLE_COLUMNS].sort());
  assert.ok(!cols.includes('id') && !cols.includes('created_at'));
});

test('no UPDATE or DELETE is granted or allowed by policy to the public', () => {
  assert.doesNotMatch(sql, /grant[^;]*\b(update|delete|all)\b[^;]*to\s+(anon|authenticated)/i);
  assert.doesNotMatch(sql, /create policy[^;]*for\s+(update|delete|all)\b/i);
});

test('photo bucket settings match constants.ts', () => {
  const m = sql.match(/insert into storage\.buckets[^;]*values \('([^']+)', '[^']+', true, (\d+), array\[([^\]]*)\]\)/);
  assert.ok(m, 'bucket insert not found');
  assert.equal(m[1], PHOTO_BUCKET);
  assert.equal(Number(m[2]), PHOTO_MAX_BYTES);
  assert.deepEqual(quoted(m[3]), [...PHOTO_MIME_TYPES]);
});
