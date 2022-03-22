import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { getTotal } from '../calculations.js';

test('getTotal should return summary of the float array', () => {
  const data = [1, 2, 3.5, 4.99];
  assert.is(getTotal(data), 11.49);
  assert.is(getTotal([]), 0);
  assert.is(getTotal(), 0);
});

test.run();
