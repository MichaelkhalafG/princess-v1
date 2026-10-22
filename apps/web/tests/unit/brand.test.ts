// The generated images (icons, Open Graph) cannot read CSS, so lib/brand.ts writes the
// logo colours out. They must stay the same as the tokens the page uses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BRAND } from '../../lib/brand.ts';

const css = readFileSync(join(import.meta.dirname, '../../app/globals.css'), 'utf8');

function token(name: string): string {
  const m = css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`));
  assert.ok(m, `${name} not found in app/globals.css`);
  return m[1].toUpperCase();
}

test('lib/brand.ts colours equal the --color-logo-* tokens', () => {
  assert.equal(BRAND.ink.toUpperCase(), token('--color-logo-ink'));
  assert.equal(BRAND.disc.toUpperCase(), token('--color-logo-disc'));
  assert.equal(BRAND.blush.toUpperCase(), token('--color-logo-blush'));
});
