import { describe, it, mock, before, after } from 'node:test';
import { resolve } from 'node:path'
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { pdfStringsMock } from './pdf-strings.mock.js';

describe('parse with mock data', async (t) => {
  let parse;

  before(async () => {
    mock.timers.enable({
      apis: ['Date'],
      now: new Date('2000-02-01T11:01:58.135Z'),
    });

    mock.module(resolve(import.meta.dirname, '../../shared/parse-pdf.js'), {
      namedExports: { getStringsFromPdf: async () => pdfStringsMock },
    });

    mock.module(resolve(import.meta.dirname, '../fetch-water.js'), { 
      namedExports: { filenamePrefix: 'water-' },
    });

    ({ parse } = await import('../parse-water.js'));
  });

  after(() => {
    mock.timers.reset();
  });

  it('should return an array of messages with heating when mock data contains heating', async () => {
    const binary = [1, 0, 1, 0];
    // expected result based on the pdfStringsMock (with heating)
    const expected = [
      {
        text: '💧: 3518.51 ₽\n(320.00 + 1378.71 + 720.00 + 1099.80)',
        value: 3518.51,
      },
      {
        text: '🔥: 644.99 ₽',
        value: 644.99,
      },
      {
        fileTitle: 'water-bill-01-2000.pdf',
        fileBuffer: binary,
      }
    ];

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


