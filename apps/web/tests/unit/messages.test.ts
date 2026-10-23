import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NETWORK_MESSAGE, SUSPENDED_MESSAGE, TRY_LATER_MESSAGE, failureMessage } from '../../lib/messages.ts';

const failure = (error: string | null, retryAfter: number | null = null) => ({ ok: false as const, status: 400, errors: {}, error, retryAfter });

test('each failure the API names has its own words', () => {
  assert.equal(failureMessage(failure('network')), NETWORK_MESSAGE);
  assert.equal(failureMessage(failure('account_suspended')), SUSPENDED_MESSAGE);
  assert.equal(failureMessage(failure(null)), TRY_LATER_MESSAGE);
  assert.equal(failureMessage(failure('something_new')), TRY_LATER_MESSAGE);
});

test('the daily limit says when she can post again, in hours', () => {
  assert.match(failureMessage(failure('posting_limit', 3600)), /بعد ساعة\.$/);
  assert.match(failureMessage(failure('posting_limit', 7000)), /بعد ساعتين\.$/);
  assert.match(failureMessage(failure('posting_limit', 5 * 3600)), /بعد ٥ ساعات\.$/);
});

test('too many attempts: a minute when it is short', () => {
  assert.match(failureMessage(failure('too_many_attempts', 40)), /بعد دقيقة\.$/);
});
