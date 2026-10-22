import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHOTO_MAX_BYTES } from '@princess/shared/constants.ts';
import { checkPhoto } from '../../lib/upload.ts';

test('checkPhoto: the design refusals, before any upload', () => {
  assert.equal(checkPhoto({ type: 'image/png', size: PHOTO_MAX_BYTES }).ok, true);
  const big = checkPhoto({ type: 'image/jpeg', size: PHOTO_MAX_BYTES + 1 });
  assert.equal(big.ok, false);
  assert.match(!big.ok ? big.reason : '', /أكبر من المسموح \(٥٫٠ ميغابايت\)/);
  const gif = checkPhoto({ type: 'image/gif', size: 10 });
  assert.match(!gif.ok ? gif.reason : '', /من نوع GIF/);
  const none = checkPhoto({ type: '', size: 10 });
  assert.match(!none.ok ? none.reason : '', /ليس صورة/);
});
