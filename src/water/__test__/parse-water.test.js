import { describe, it, mock, before } from 'node:test';
import { resolve } from 'node:path'
import assert from 'node:assert/strict';
import { pdfStringsMock } from './pdf-strings.mock.js';

describe('parse', async (t) => {
  let parse;

  let binary;
  let expected;

  before(async () => {
    mock.module(resolve(import.meta.dirname, '../../shared/parse-pdf.js'), {
      namedExports: { getStringsFromPdf: async () => pdfStringsMock },
    });

    mock.module(resolve(import.meta.dirname, '../fetch-water.js'), { 
      namedExports: { filenamePrefix: 'water-' },
    });

    binary = [1, 0, 1, 0];
    // expected result based on the pdfStringsMock
    expected = {
      text: '💧: 3518.51 ₽\n(320.00 + 1378.71 + 720.00 + 1099.80)',
      value: 3518.51,
      fileTitle: 'water-bill.pdf',
      fileBuffer: binary,
    };

    ({ parse } = await import('../parse-water.js'));
  });

  it('should return an object with "text", "value", "fileTitle", and "fileBuffer" properties when given a non-empty binary input', async () => {
    const result = await parse(binary);
    assert.deepEqual(result, expected);
  });

  it('should return "Счёта пока что нет 🙁" when given an empty binary input', async () => {
    const binary = [];
    const expected = { text: '💧: Счёта пока что нет 🙁' };
    const result = await parse(binary);

    assert.deepEqual(result, expected);
  });
});
