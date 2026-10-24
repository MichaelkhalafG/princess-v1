import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CSS_PATH, OUT_PATH, render } from '../scripts/generate.ts';
import { CSS_TOKENS } from '../src/css-tokens.ts';
import { color, edges, fluid, px, ratio, raw, shadow } from '../src/native.ts';

test('css-tokens.ts is exactly what globals.css generates (run `npm run generate` after changing a token)', () => {
  assert.equal(readFileSync(OUT_PATH, 'utf8'), render(readFileSync(CSS_PATH, 'utf8')));
});

test('every token resolves: no dangling var(), no self-reference', () => {
  for (const name of Object.keys(CSS_TOKENS)) {
    assert.doesNotThrow(() => raw(name), name);
    assert.ok(!raw(name).includes('var('), name);
  }
});

test('colours come out in the comma syntax React Native parses', () => {
  assert.equal(color('color-ink'), '#1C0A14');
  assert.equal(color('color-bar-border'), 'rgba(122, 41, 72, 0.12)');
  assert.ok(!/rgb\(\d+ /.test(shadow('shadow-card')), 'no space-syntax rgb() left in a shadow');
  assert.equal(shadow('shadow-card'), '0 30px 56px -26px rgba(122, 41, 72, 0.22), 0 2px 10px rgba(122, 41, 72, 0.05)');
});

test('lengths, fluid lengths and ratios', () => {
  assert.equal(px('space-11'), 16);
  // clamp(16px, 4vw, 48px): 4% of 380 is 15.2, under the floor
  assert.equal(fluid('gutter-page', 380), 16);
  assert.equal(fluid('gutter-page', 1440), 48);
  assert.equal(fluid('space-11', 380), 16, 'a plain length is itself');
  assert.equal(Math.round(ratio('ratio-media') * 1000) / 1000, 1.212);
  // the phone override wins
  assert.equal(px('size-header'), 56);
});

test('a shorthand of lengths gives its four sides (the phone value of --pad-form-card)', () => {
  assert.deepEqual(edges('pad-form-card'), { top: 22, right: 16, bottom: 20, left: 16 });
});
