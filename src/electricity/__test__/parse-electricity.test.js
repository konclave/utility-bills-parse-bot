import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../parse-electricity.js';

describe('electricity', () => {
  describe('parse', () => {
    const pdfBuffer = readFileSync(`${import.meta.dirname}/invoice.pdf`);
    it('should get invoice value from PDF', async () => {
      const result = await parse(pdfBuffer);
      assert(result.value, 754.17);
    });
  });
});
