import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import esmock from 'esmock';
import { pdfStringsMock } from './pdf-strings.mock.js';

const { parse } = await esmock('../parse-water.js', {
  '../../shared/parse-pdf.js': {
    getStringsFromPdf: async () => pdfStringsMock,
  },
  '../fetch-water.js': {
    filenamePrefix: 'water-',
  },
});

describe('parse', async () => {
  const binary = [1, 0, 1, 0];
  // expected result based on the pdfStringsMock
  const expected = {
    text: '💧: 3518.51 ₽\n(320.00 + 1378.71 + 720.00 + 1099.80)',
    value: 3518.51,
    fileTitle: 'water-bill.pdf',
    fileBuffer: binary,
  };

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
