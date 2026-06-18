import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { resolve } from 'node:path';

const processingModulePath = resolve(import.meta.dirname, '../processing.js');
const waterModulePath = resolve(import.meta.dirname, '../../water/index.js');
const electricityModulePath = resolve(import.meta.dirname, '../../electricity/index.js');
const mosobleircModulePath = resolve(import.meta.dirname, '../../mosobleirc/index.js');
const blobModulePath = resolve(import.meta.dirname, '../../shared/blob.js');
const mosobleircParsePath = resolve(import.meta.dirname, '../../mosobleirc/parse.js');
const waterParsePath = resolve(import.meta.dirname, '../../water/parse-water.js');
const electricityParsePath = resolve(import.meta.dirname, '../../electricity/parse-electricity.js');

afterEach(() => mock.restoreAll());

describe('getValues', () => {
  it('continues processing when one provider rejects', async () => {
    mock.module(waterModulePath, {
      namedExports: { fetch: async () => [{ emoji: '💧', label: 'Вода', value: 100 }] },
    });
    mock.module(electricityModulePath, {
      namedExports: { fetch: async () => { throw new Error('down'); } },
    });
    mock.module(mosobleircModulePath, {
      namedExports: { fetch: async () => [{ emoji: '💧', label: 'Вода', value: 200 }] },
    });

    const { getValues } = await import(`${processingModulePath}?all-settled`);
    const result = await getValues({ venue: undefined, format: 'compact' });

    assert.match(result.text, /Итого: 300 ₽/);
    assert.match(result.text, /unavailable/i);
    assert.equal(Array.isArray(result.attachments), true);
  });
});

describe('getValuesViaProxy — mosobleirc', () => {
  it('reads mosobleirc PDF from Vercel Blob when available and skips proxy call', async () => {
    const proxyFetchCalls = [];
    mock.module(blobModulePath, {
      namedExports: { fetchByName: async () => Buffer.from('fake pdf'), store: async () => {} },
    });
    mock.module(mosobleircParsePath, {
      namedExports: {
        parsePdfToChargeData: async () => ({ chargeDetails: [] }),
        parseCharges: async () => [{ emoji: '🏠', label: 'Одинцово', value: 500 }],
        appendPdfMessage: ({ messages }) => messages,
      },
    });
    mock.method(globalThis, 'fetch', async (...args) => {
      proxyFetchCalls.push(args);
      return { ok: true, json: async () => ({ encoding: 'json', data: [] }) };
    });

    const { getValuesViaProxy } = await import(`${processingModulePath}?mosobl-blob-hit`);
    const result = await getValuesViaProxy('https://proxy.yc/bills', { venue: 'O' });

    assert.strictEqual(proxyFetchCalls.length, 0);
    assert.match(result.text, /500 ₽/);
  });

  it('falls back to proxy JSON when Blob has no mosobleirc PDF', async () => {
    const proxyFetchCalls = [];
    mock.module(blobModulePath, {
      namedExports: { fetchByName: async () => null, store: async () => {} },
    });
    mock.module(mosobleircParsePath, {
      namedExports: {
        parsePdfToChargeData: async () => ({}),
        parseCharges: async () => [{ emoji: '🏠', label: 'Одинцово', value: 300 }],
        appendPdfMessage: ({ messages }) => messages,
      },
    });
    mock.method(globalThis, 'fetch', async (url, options) => {
      proxyFetchCalls.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ encoding: 'json', data: { chargeDetails: [] } }) };
    });

    const { getValuesViaProxy } = await import(`${processingModulePath}?mosobl-blob-miss`);
    const result = await getValuesViaProxy('https://proxy.yc/bills', { venue: 'O' });

    assert.strictEqual(proxyFetchCalls.length, 1);
    assert.deepEqual(proxyFetchCalls[0], { provider: 'mosobleirc' });
    assert.match(result.text, /300 ₽/);
  });
});

describe('getValuesViaProxy — water', () => {
  it('reads water PDF from Vercel Blob when available and skips proxy call', async () => {
    const proxyFetchCalls = [];
    mock.module(blobModulePath, {
      namedExports: { fetchByName: async () => Buffer.from('water pdf'), store: async () => {} },
    });
    mock.module(waterParsePath, {
      namedExports: { parse: async () => [{ emoji: '💧', label: 'Вода', value: 120 }] },
    });
    mock.method(globalThis, 'fetch', async (...args) => {
      proxyFetchCalls.push(args);
      return { ok: true, json: async () => ({}) };
    });

    const { getValuesViaProxy } = await import(`${processingModulePath}?water-blob-hit`);
    const result = await getValuesViaProxy('https://proxy.yc/bills', { venue: 'T' });

    assert.strictEqual(proxyFetchCalls.length, 0);
    assert.match(result.text, /120 ₽/);
  });

  it('fetches water and electricity PDFs from proxy, stores in Blob, and returns parsed results on Blob miss', async () => {
    const stored = [];
    const fakePdf = Buffer.from('water pdf binary');
    mock.module(blobModulePath, {
      namedExports: {
        fetchByName: async () => null,
        store: async (buf, filename) => stored.push({ filename }),
      },
    });
    mock.module(waterParsePath, {
      namedExports: { parse: async () => [{ emoji: '💧', label: 'Вода', value: 150 }] },
    });
    mock.module(electricityParsePath, {
      namedExports: { parse: async () => [{ emoji: '⚡', label: 'Электричество', value: 200 }] },
    });
    mock.method(globalThis, 'fetch', async (url, options) => ({
      ok: true,
      json: async () => ({ encoding: 'base64', data: fakePdf.toString('base64') }),
    }));

    const { getValuesViaProxy } = await import(`${processingModulePath}?water-blob-miss`);
    const result = await getValuesViaProxy('https://proxy.yc/bills', { venue: 'T' });

    assert.match(result.text, /150 ₽/);
    assert.strictEqual(stored.length, 2);
    assert.match(stored[0].filename, /^water-/);
    assert.match(stored[1].filename, /^electricity-/);
  });
});
