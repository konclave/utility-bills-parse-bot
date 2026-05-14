import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parse } from '../parse-electricity.js';

describe('electricity', () => {
  describe('parse', () => {
    const pdfBuffer = readFileSync(
      `${import.meta.dirname}/../../__fixtures__/mosenergo_test.pdf`,
    );

    it('returns a structured entry with value parsed from PDF', async () => {
      const result = await parse(pdfBuffer);
      assert.strictEqual(result[0].emoji, '⚡️');
      assert.strictEqual(result[0].label, 'Электричество');
      assert.strictEqual(result[0].value, 879.54);
      assert.ok(result[1].fileBuffer);
      assert.ok(result[1].fileTitle);
    });

    it('returns a null-value entry for empty binary', async () => {
      const result = await parse(Buffer.alloc(0));
      assert.deepStrictEqual(result, {
        emoji: '⚡️',
        label: 'Электричество',
        value: null,
        message: 'Счёта пока что нет 🙁',
      });
    });
  });
});
