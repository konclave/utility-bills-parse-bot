import { describe, it, mock, before, after } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { resolve } from 'node:path'

const withoutHeatingMock = JSON.parse(readFileSync(resolve(import.meta.dirname, './water_without_heating.json'), 'utf-8'));

describe('parse with mock data - without heating', () => {
  let parse;

  before(async () => {
    mock.timers.enable({
      apis: ['Date'],
      now: new Date('2000-02-01T11:01:58.135Z'),
    });

    // Mock the PDF parser to return data without heating
    mock.module(resolve(import.meta.dirname, '../../shared/parse-pdf.js'), {
      namedExports: { getStringsFromPdf: async () => withoutHeatingMock },
    });

    mock.module(resolve(import.meta.dirname, '../fetch-water.js'), {
      namedExports: { filenamePrefix: 'water-' },
    });

    ({ parse } = await import('../parse-water.js'));
  });

  after(() => {
    mock.timers.reset();
    mock.restoreAll();
  });

  it('should return an array of messages without heating when mock data doesn\'t contain heating', async () => {
    const binary = [1, 0, 1, 0];
    const expected = [
      {
        text: '💧: 1015.25 ₽\n(112.41 + 421.53 + 172.93 + 308.38)',
        value: 1015.25,
      },
      {
        text: '🔥: 0 ₽',
        value: 0,
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



