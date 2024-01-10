import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { format, getErrorMessage, messageTypeText } from '../message.js';
import { getPeriodString } from '../period.js';

describe('getErrorMessage', () => {
  it('should return error message', () => {
    assert.equal(getErrorMessage('🤔'), '🤔: Что-то пошло не так 💩');
  });

  it('should return error message if no arguments passed', () => {
    assert.equal(getErrorMessage(), ': Что-то пошло не так 💩');
  });
});

describe('format', () => {
  it('format should return empty erray on empty arguments', () => {
    assert.deepEqual(format(), []);
  });

  it('format should format text messages', () => {
    const fixture = [
      { text: 'foo', value: 1.37 },
      { text: 'bar', value: 2.5 },
    ];

    const expected = `Счета за период: ${getPeriodString()}\nfoo\nbar`;
    assert.deepEqual(format(fixture), [
      { type: messageTypeText, data: expected },
    ]);
  });
});
