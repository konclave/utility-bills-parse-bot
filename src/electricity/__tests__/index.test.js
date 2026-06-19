import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { setImmediate as waitForTurn } from 'node:timers/promises';

const indexPath = resolve(import.meta.dirname, '../index.js');
const storagePath = resolve(import.meta.dirname, '../../shared/storage.js');
const fetchElectricityPath = resolve(import.meta.dirname, '../fetch-electricity.js');
const parsePath = resolve(import.meta.dirname, '../parse-electricity.js');
const periodPath = resolve(import.meta.dirname, '../../shared/period.js');

async function importElectricityIndex({
  blobResult = null,
  storeResult = async () => {},
  directFetch = async () => Buffer.from('direct pdf'),
  parse = async () => [{ label: 'Электричество', value: 200 }],
  getCurrentPeriodFilename = () => 'electricity-05-2026.pdf',
} = {}, suffix) {
  mock.module(storagePath, {
    namedExports: {
      fetch: async () => blobResult,
      store: storeResult,
      purge: async () => {},
    },
  });
  mock.module(fetchElectricityPath, {
    namedExports: { fetch: directFetch, filenamePrefix: 'electricity-' },
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

describe('electricity index fetch', () => {
  it('returns parsed blob result without calling proxy or direct fetch', async () => {
    const directCalls = [];
    const proxyCalls = [];
    const { fetch } = await importElectricityIndex({
      blobResult: Buffer.from('cached pdf'),
      directFetch: async () => { directCalls.push(1); return Buffer.from('x'); },
    }, 'electricity-blob-hit');
    mock.method(globalThis, 'fetch', async (...args) => { proxyCalls.push(args); });

    const result = await fetch();

    assert.strictEqual(directCalls.length, 0);
    assert.strictEqual(proxyCalls.length, 0);
    assert.ok(Array.isArray(result));
  });

  it('fetches from proxy, stores buffer fire-and-forget, returns parsed result on blob miss', async () => {
    const stored = [];
    const fakePdf = Buffer.from('%PDF proxy-electricity');
    process.env.YC_PROXY_URL = 'https://proxy.yc/bills';
    const { fetch } = await importElectricityIndex({
      blobResult: null,
      storeResult: async (buf, filename) => { stored.push({ filename }); },
    }, 'electricity-proxy-path');
    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      json: async () => ({ encoding: 'base64', data: fakePdf.toString('base64') }),
    }));

    const result = await fetch();
    await waitForTurn();

    assert.strictEqual(stored.length, 1);
    assert.match(stored[0].filename, /^electricity-/);
    assert.ok(Array.isArray(result));
  });

  it('calls direct fetchElectricity when blob miss and no YC_PROXY_URL', async () => {
    const directCalls = [];
    const { fetch } = await importElectricityIndex({
      blobResult: null,
      directFetch: async () => { directCalls.push(1); return Buffer.from('direct pdf'); },
    }, 'electricity-direct-path');

    const result = await fetch();

    assert.strictEqual(directCalls.length, 1);
    assert.ok(Array.isArray(result));
  });
});
