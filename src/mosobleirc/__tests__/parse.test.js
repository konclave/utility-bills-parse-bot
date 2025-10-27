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
      assert(result.length, 4);
      assert(result[0].value, 1329.45);
      assert(result[1].value, 802.26);
      assert(result[2].value, 125.56);
      assert(result[3].value, 1166.43);
    });
  });
});
