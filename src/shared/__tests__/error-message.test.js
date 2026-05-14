import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { getErrorMessage } from '../error-message.js';

describe('getErrorMessage', () => {
  it('returns the prefixed error message', () => {
    assert.equal(getErrorMessage('🤔'), '🤔: Что-то пошло не так 💩');
  });

  it('returns the default error message when no prefix is passed', () => {
    assert.equal(getErrorMessage(), ': Что-то пошло не так 💩');
  });
});
