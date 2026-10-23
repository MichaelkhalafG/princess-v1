// The shared case file, run against this package's validator. The API runs the same file
// against its own (apps/api/tests/Unit/ListingCasesTest.php), so the two cannot drift apart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATEGORIES, COUNTRIES, LIMITS } from '../src/constants.ts';
import { validateListing, WRITABLE_COLUMNS } from '../src/listing.ts';
import { LISTING_STATUSES, MODERATION_REASONS, REPORT_REASONS } from '../src/moderation.ts';

type Case = { name: string; set: Record<string, unknown>; unset: string[] } & (
  | { ok: true; expect: Record<string, unknown> }
  | { ok: false; errors: Record<string, string> }
);
type CaseFile = {
  rules: {
    categories: Record<string, string>;
    countries: Record<string, { dial: string; length: number; lead: string }>;
    limits: Record<string, number>;
    writable: string[];
    moderation_reasons: string[];
    report_reasons: string[];
    statuses: string[];
  };
  base: Record<string, unknown>;
  cases: Case[];
};

const file: CaseFile = JSON.parse(readFileSync(join(import.meta.dirname, '../cases/listing-validation.json'), 'utf8'));

function inputOf(c: Case): Record<string, unknown> {
  const input: Record<string, unknown> = { ...file.base, ...c.set };
  for (const key of c.unset) delete input[key];
  return input;
}

test('this package carries the rules the case file states', () => {
  assert.deepEqual(Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.label])), file.rules.categories);
  assert.deepEqual(
    Object.fromEntries(COUNTRIES.map((k) => [k.code, { dial: k.dialCode, length: k.phone.length, lead: k.phone.lead }])),
    file.rules.countries,
  );
  assert.deepEqual({ ...LIMITS }, file.rules.limits);
  assert.deepEqual([...WRITABLE_COLUMNS], file.rules.writable);
});

test('this package words every moderation code the API answers with, and no other', () => {
  assert.deepEqual(Object.keys(MODERATION_REASONS), file.rules.moderation_reasons);
  assert.deepEqual(Object.keys(REPORT_REASONS), file.rules.report_reasons);
  assert.deepEqual(Object.keys(LISTING_STATUSES), file.rules.statuses);
});

test('the case file has cases on both sides', () => {
  assert.ok(file.cases.some((c) => c.ok) && file.cases.some((c) => !c.ok));
});

for (const c of file.cases) {
  test(`case: ${c.name}`, () => {
    const r = validateListing(inputOf(c));
    if (c.ok) {
      assert.ok(r.ok, `expected it to pass, got ${JSON.stringify(!r.ok && r.errors)}`);
      for (const [key, value] of Object.entries(c.expect)) assert.equal(r.value[key as keyof typeof r.value], value, key);
      assert.deepEqual(Object.keys(r.value).sort(), [...file.rules.writable].sort(), 'nothing but the writable fields');
    } else {
      assert.equal(r.ok, false, 'expected it to be refused');
      assert.deepEqual(!r.ok && r.errors, c.errors);
    }
  });
}
