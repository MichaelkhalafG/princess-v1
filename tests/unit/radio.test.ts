import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextRadioIndex, radioTabIndex } from '../../lib/radio.ts';

test('right-to-left: the left arrow is "next", the right arrow "previous", both wrap', () => {
  assert.equal(nextRadioIndex('ArrowLeft', 0, 3, true), 1);
  assert.equal(nextRadioIndex('ArrowLeft', 2, 3, true), 0);
  assert.equal(nextRadioIndex('ArrowRight', 0, 3, true), 2);
  assert.equal(nextRadioIndex('ArrowRight', 1, 3, true), 0);
});

test('left-to-right flips the horizontal arrows; up/down are the same either way', () => {
  assert.equal(nextRadioIndex('ArrowRight', 0, 3, false), 1);
  assert.equal(nextRadioIndex('ArrowLeft', 0, 3, false), 2);
  for (const rtl of [true, false]) {
    assert.equal(nextRadioIndex('ArrowDown', 2, 3, rtl), 0);
    assert.equal(nextRadioIndex('ArrowUp', 0, 3, rtl), 2);
  }
});

test('Home and End jump to the ends; other keys are not handled', () => {
  assert.equal(nextRadioIndex('Home', 7, 11, true), 0);
  assert.equal(nextRadioIndex('End', 0, 11, true), 10);
  assert.equal(nextRadioIndex('Tab', 1, 3, true), null);
  assert.equal(nextRadioIndex('a', 1, 3, true), null);
  assert.equal(nextRadioIndex('ArrowLeft', 0, 0, true), null);
});

test('exactly one radio takes Tab: the checked one, else the first', () => {
  const stops = (checked: number, count: number) => Array.from({ length: count }, (_, i) => radioTabIndex(i, checked)).filter((t) => t === 0).length;
  assert.equal(stops(2, 3), 1);
  assert.equal(stops(-1, 11), 1);
  assert.equal(radioTabIndex(0, -1), 0);
  assert.equal(radioTabIndex(2, 2), 0);
  assert.equal(radioTabIndex(1, 2), -1);
});
