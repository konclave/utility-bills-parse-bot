import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { format, getErrorMessage, messageTypeText } from '../message.js';
import { getPeriodString } from '../period.js';
import { getTotal } from '../calculations.js';

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

  it.skip('format should format text messages', () => {
    const fixture = [
      { text: 'foo', value: 1.37 },
      { text: 'bar', value: 2.5 },
    ];

    const expected = `Счета·за·период:·${getPeriodString()}\nfoo\nbar\nВсего: ${getTotal(
      fixture.map((f) => f.value),
    )}₽`;
    assert.equal(format(fixture), [{ type: messageTypeText, data: expected }]);
  });
});
