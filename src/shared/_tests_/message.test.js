import { test, suite } from 'uvu';
import * as assert from 'uvu/assert';
import { format, getErrorMessage, messageTypeText } from '../message.js';
import { getPeriodString } from '../period.js';
import { getTotal } from '../calculations.js';

const getErrorMessageSuite = suite('getErrorMessage');
getErrorMessageSuite('should return error message', () => {
  assert.is(getErrorMessage('🤔'), '🤔: Что-то пошло не так 💩');
});

getErrorMessageSuite(
  'should return error message if no arguments passed',
  () => {
    assert.is(getErrorMessage(), ': Что-то пошло не так 💩');
  }
);

const formatSuite = suite('format');
formatSuite('format should return empty erray on empty arguments', () => {
  assert.equal(format(), []);
});

formatSuite.skip('format should format text messages', () => {
  const fixture = [
    { text: 'foo', value: 1.37 },
    { text: 'bar', value: 2.5 },
  ];

  const expected = `Счета·за·период:·${getPeriodString()}\nfoo\nbar\nВсего: ${getTotal(
    fixture.map((f) => f.value)
  )}₽`;
  assert.equal(format(fixture), [{ type: messageTypeText, data: expected }]);
});

getErrorMessageSuite.run();
formatSuite.run();
