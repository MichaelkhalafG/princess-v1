// Every design token the app names exists, and is read the way its value allows: a fluid token
// (clamp(), min(), container units) only through fluid() — px() refuses it at runtime, and inside
// a StyleSheet.create that takes the whole screen down.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { raw } from '../../../packages/tokens/src/native.ts';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}
const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const sources = files(SRC).map((f) => ({ f, text: readFileSync(f, 'utf8') }));

test('every token the app names exists', () => {
  for (const { f, text } of sources) {
    for (const m of text.matchAll(/\b(?:px|fluid|color|shadow|num|ratio|em|edges|raw)\('([a-z0-9-]+)'/g)) {
      assert.doesNotThrow(() => raw(m[1]), `${f}: --${m[1]}`);
    }
    for (const m of text.matchAll(/\b(?:size|leading)="([a-z0-9-]+)"/g)) {
      assert.doesNotThrow(() => raw(m[1]), `${f}: --${m[1]}`);
    }
  }
});

test('no fluid token is read as a fixed length', () => {
  for (const { f, text } of sources) {
    for (const m of text.matchAll(/\b(?:px|edges)\('([a-z0-9-]+)'/g)) {
      assert.ok(!/clamp\(|min\(|max\(|cqi|vw/.test(raw(m[1])), `${f}: px('${m[1]}') is fluid (${raw(m[1])}): use fluid()`);
    }
  }
});
