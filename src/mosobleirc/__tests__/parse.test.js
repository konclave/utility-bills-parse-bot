import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCharges, parsePdfToChargeData } from '../parse.js';

describe('mosobleirc', () => {
    describe('parsePdfToChargeData', () => {
    const pdfBuffer = readFileSync(`${import.meta.dirname}/eirc_invoice.pdf`);

    it('should get invoice value from PDF', async () => {
      const pdfParse = await parsePdfToChargeData(pdfBuffer);
      const result = await parseCharges(pdfParse);
      assert.equal(result.length, 5);
      assert.equal(result[0].value, 1329.45);
      assert.equal(result[1].value, 802.26);
      assert.equal(result[2].value, 125.56);
      assert.equal(result[3].value, 1166.43);
      assert.equal(result[4].value, 0.00);

      assert.equal(result[4].text, '♨️: 0.00 ₽');
    });
  });
});
