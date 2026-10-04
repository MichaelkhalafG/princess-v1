import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHOTO_MAX_EDGE, fitWithin } from '../../lib/photo-resize.ts';

test('a large photo is scaled so its longest side is PHOTO_MAX_EDGE, keeping its shape', () => {
  assert.deepEqual(fitWithin(4032, 3024), { width: PHOTO_MAX_EDGE, height: 1200 });
  assert.deepEqual(fitWithin(3024, 4032), { width: 1200, height: PHOTO_MAX_EDGE });
  assert.deepEqual(fitWithin(6000, 6000), { width: PHOTO_MAX_EDGE, height: PHOTO_MAX_EDGE });
});

test('a photo already small enough is never enlarged', () => {
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
  assert.deepEqual(fitWithin(PHOTO_MAX_EDGE, 10), { width: PHOTO_MAX_EDGE, height: 10 });
});

test('a very thin photo keeps at least one pixel', () => {
  assert.deepEqual(fitWithin(16000, 2), { width: PHOTO_MAX_EDGE, height: 1 });
});
