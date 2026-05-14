import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { resolve } from 'node:path';

const processingModulePath = resolve(import.meta.dirname, '../processing.js');
const waterModulePath = resolve(import.meta.dirname, '../../water/index.js');
const electricityModulePath = resolve(import.meta.dirname, '../../electricity/index.js');
const mosobleircModulePath = resolve(import.meta.dirname, '../../mosobleirc/index.js');

afterEach(() => {
  mock.restoreAll();
});

describe('getValues', () => {
  it('continues processing when one provider rejects', async () => {
    mock.module(waterModulePath, {
      namedExports: {
        fetch: async () => [{ text: '💧: 100 ₽', value: 100 }],
      },
    });
    mock.module(electricityModulePath, {
      namedExports: {
        fetch: async () => {
          throw new Error('down');
        },
      },
    });
    mock.module(mosobleircModulePath, {
      namedExports: {
        fetch: async () => [{ text: 'Одинцово: 200 ₽', value: 200 }],
      },
    });

    const { getValues } = await import(`${processingModulePath}?all-settled`);
    const result = await getValues({ venue: undefined });

    assert.match(result.text, /Total: 300 ₽/);
    assert.match(result.text, /unavailable/i);
    assert.match(result.text, /💧: 100 ₽/);
    assert.match(result.text, /Одинцово: 200 ₽/);
    assert.equal(Array.isArray(result.attachments), true);
  });
});
