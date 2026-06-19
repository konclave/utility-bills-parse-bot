import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { setImmediate as waitForTurn } from 'node:timers/promises';

const indexPath = resolve(import.meta.dirname, '../index.js');
const storagePath = resolve(import.meta.dirname, '../../shared/storage.js');
const fetchWaterPath = resolve(import.meta.dirname, '../fetch-water.js');
const parsePath = resolve(import.meta.dirname, '../parse-water.js');
const periodPath = resolve(import.meta.dirname, '../../shared/period.js');

async function importWaterIndex({
  blobResult = null,
  storeResult = async () => {},
  directFetch = async () => Buffer.from('direct pdf'),
  parse = async () => [{ label: 'Вода', value: 100 }],
  getCurrentPeriodFilename = () => 'water-05-2026.pdf',
} = {}, suffix) {
  mock.module(storagePath, {
    namedExports: {
      fetch: async () => blobResult,
      store: storeResult,
      purge: async () => {},
    },
  });
  mock.module(fetchWaterPath, {
    namedExports: { fetch: directFetch, filenamePrefix: 'water-' },
  });
  mock.module(parsePath, {
    namedExports: { parse },
  });
  mock.module(periodPath, {
    namedExports: { getCurrentPeriodFilename },
  });
  return import(`${indexPath}?${suffix}`);
}

afterEach(() => {
  mock.restoreAll();
  delete process.env.YC_PROXY_URL;
});

describe('water index fetch', () => {
  it('returns parsed blob result without calling proxy or direct fetch', async () => {
    const directCalls = [];
    const proxyCalls = [];
    const { fetch } = await importWaterIndex({
      blobResult: Buffer.from('cached pdf'),
      directFetch: async () => { directCalls.push(1); return Buffer.from('x'); },
    }, 'water-blob-hit');
    mock.method(globalThis, 'fetch', async (...args) => { proxyCalls.push(args); });

    const result = await fetch();

    assert.strictEqual(directCalls.length, 0);
    assert.strictEqual(proxyCalls.length, 0);
    assert.ok(Array.isArray(result));
  });

  it('fetches from proxy, stores buffer fire-and-forget, returns parsed result on blob miss', async () => {
    const stored = [];
    const fakePdf = Buffer.from('%PDF proxy-water');
    process.env.YC_PROXY_URL = 'https://proxy.yc/bills';
    const { fetch } = await importWaterIndex({
      blobResult: null,
      storeResult: async (buf, filename) => { stored.push({ filename }); },
    }, 'water-proxy-path');
    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      json: async () => ({ encoding: 'base64', data: fakePdf.toString('base64') }),
    }));

    const result = await fetch();
    await waitForTurn();

    assert.strictEqual(stored.length, 1);
    assert.match(stored[0].filename, /^water-/);
    assert.ok(Array.isArray(result));
  });

  it('calls direct fetchWater when blob miss and no YC_PROXY_URL', async () => {
    const directCalls = [];
    const { fetch } = await importWaterIndex({
      blobResult: null,
      directFetch: async () => { directCalls.push(1); return Buffer.from('direct pdf'); },
    }, 'water-direct-path');

    const result = await fetch();

    assert.strictEqual(directCalls.length, 1);
    assert.ok(Array.isArray(result));
  });
});
