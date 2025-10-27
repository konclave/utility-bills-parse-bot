import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCharges, parsePdfToChargeData } from '../parse.js';

describe('mosobleirc', () => {
    describe('parseCharges', () => {
    const pdfBuffer = readFileSync(`${import.meta.dirname}/eirc_invoice.pdf`);

    it('should get invoice value from PDF', async () => {
      const result = await parseCharges(pdfBuffer);

      assert(result.length, 4);
      assert(result[0].value, 1329.45);
      assert(result[1].value, 802.26);
      assert(result[2].value, 125.56);
      assert(result[3].value, 1166.43);
    });

    it('should handle null input gracefully', async () => {
      const result = await parseCharges(null);
      assert.equal(result.text, 'Одинцово: Счёта пока что нет 🙁');
      assert.equal(result.value, 0);
    });

    it('should handle empty buffer gracefully', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = await parseCharges(emptyBuffer);
      assert.equal(result.text, 'Одинцово: Ошибка обработки PDF 😞');
      assert.equal(result.value, 0);
    });

    it('should handle invalid PDF buffer gracefully', async () => {
      const invalidBuffer = Buffer.from('not a pdf file');
      const result = await parseCharges(invalidBuffer);
      assert.equal(result.text, 'Одинцово: Ошибка обработки PDF 😞');
      assert.equal(result.value, 0);
    });

    it('should handle JSON input with missing chargeDetails', async () => {
      const invalidJson = { someOtherField: 'value' };
      const result = await parseCharges(invalidJson);
      assert.equal(result.text, 'Одинцово: Счёта пока что нет 🙁');
      assert.equal(result.value, 0);
    });

    it('should handle JSON input with empty chargeDetails', async () => {
      const emptyJson = { chargeDetails: [] };
      const result = await parseCharges(emptyJson);
      assert.equal(result.text, 'Одинцово: Данные о начислениях не найдены 🙁');
      assert.equal(result.value, 0);
    });
  });

  describe('parsePdfToChargeData', () => {
    it('should return error for null buffer', async () => {
      const result = await parsePdfToChargeData(null);
      assert.equal(result.success, false);
      assert(result.error.includes('null or undefined'));
      assert.equal(result.chargeDetails.length, 0);
    });

    it('should return error for empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = await parsePdfToChargeData(emptyBuffer);
      assert.equal(result.success, false);
      assert(result.error.includes('empty'));
      assert.equal(result.chargeDetails.length, 0);
    });

    it('should return error for invalid PDF header', async () => {
      const invalidBuffer = Buffer.from('not a pdf file');
      const result = await parsePdfToChargeData(invalidBuffer);
      assert.equal(result.success, false);
      assert(result.error.includes('Invalid PDF header'));
      assert.equal(result.chargeDetails.length, 0);
    });

    it('should return error for too small buffer', async () => {
      const tinyBuffer = Buffer.from('pdf');
      const result = await parsePdfToChargeData(tinyBuffer);
      assert.equal(result.success, false);
      assert(result.error.includes('too small'));
      assert.equal(result.chargeDetails.length, 0);
    });
  });
});
