import { describe, it, mock, before, after } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'fs';
import { resolve } from 'node:path'

const withHeatingMock = JSON.parse(readFileSync(resolve(import.meta.dirname, './water_with_heating.json'), 'utf-8'));

describe('parse with mock data - with heating', () => {
  let parse;

  before(async () => {
    mock.timers.enable({
      apis: ['Date'],
      now: new Date('2000-02-01T11:01:58.135Z'),
    });

    mock.module(resolve(import.meta.dirname, '../../shared/parse-pdf.js'), {
      namedExports: { getStringsFromPdf: async () => withHeatingMock },
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

  it('should return an array of messages with heating when mock data contains heating', async () => {
    const binary = [1, 0, 1, 0];
    const expected = [
      {
        text: '💧: 1684.7 ₽\n(146.99 + 551.22 + 397.75 + 588.74)',
        value: 1684.7,
      },
      {
        text: '🔥: 723.40 ₽',
        value: 723.40,
      },
      {
        fileTitle: 'water-bill-01-2000.pdf',
        fileBuffer: binary,
      }
    ];

    const result = await parse(binary);
    assert.deepEqual(result, expected);
  });
});
