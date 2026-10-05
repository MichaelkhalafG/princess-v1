// The search-engine switch is one switch: lib/site.ts INDEXABLE, read only by the root
// layout. A page that set its own `robots` would replace the layout's (Next merges
// metadata shallowly), and turning the switch on at launch would miss it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const app = join(import.meta.dirname, '../../app');

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return sources(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });
}

test('no file in app/ but the root layout says anything about robots', () => {
  const files = sources(app);
  assert.ok(files.length > 5, 'the app directory was read');
  const offenders = files
    .filter((f) => relative(app, f).replace(/\\/g, '/') !== 'layout.tsx')
    .filter((f) => /robots/i.test(readFileSync(f, 'utf8')))
    .map((f) => relative(app, f));
  assert.deepEqual(offenders, []);
});

test('the root layout takes robots from INDEXABLE and nowhere else', () => {
  const layout = readFileSync(join(app, 'layout.tsx'), 'utf8');
  assert.match(layout, /import \{[^}]*\bINDEXABLE\b[^}]*\} from '@\/lib\/site\.ts'/);
  assert.match(layout, /INDEXABLE \? \{\} : \{ robots: \{ index: false, follow: false \} \}/);
});
