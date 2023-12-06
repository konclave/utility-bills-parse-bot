import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { getTotal } from '../calculations.js';

describe('getTotal', () => {
  it('should return summary of the float array', () => {
    const data = [1, 2, 3.5, 4.99];
    assert.equal(getTotal(data), 11.49);
    assert.equal(getTotal([]), 0);
    assert.equal(getTotal(), 0);
  });
});
