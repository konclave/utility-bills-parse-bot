import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

const indexModulePath = resolve(import.meta.dirname, '../index.js');
const storeModulePath = resolve(import.meta.dirname, '../store.js');
const fetchModulePath = resolve(import.meta.dirname, '../fetch.js');
const parseModulePath = resolve(import.meta.dirname, '../parse.js');
const storageModulePath = resolve(import.meta.dirname, '../store.js');
const periodModulePath = resolve(import.meta.dirname, '../../shared/period.js');
const messageModulePath = resolve(import.meta.dirname, '../../shared/error-message.js');
const s3ModulePath = resolve(import.meta.dirname, '../../shared/s3.js');

async function importMosOblFetch(
  {
    fetchCharges = async () => [],
    parseCharges = async () => [],
    parsePdfToChargeData = async () => {
      throw new Error('pdf parse failed');
    },
    appendPdfMessage = ({ messages }) => messages,
    fetchPdf = async () => Buffer.from('pdf'),
    fetchStore = async () => undefined,
    store = async () => undefined,
    getPeriodString = () => '04-2026',
    getTodayISODate = () => '2026-05-13',
    getErrorMessage = (prefix) => `${prefix}: Что-то пошло не так 💩`,
  },
  suffix,
) {
  mock.module(fetchModulePath, {
    namedExports: { fetchCharges },
  });
  mock.module(parseModulePath, {
    namedExports: {
      appendPdfMessage,
      parseCharges,
      parsePdfToChargeData,
    },
  });
  mock.module(storageModulePath, {
    namedExports: {
      fetch: fetchStore,
      fetchPdf,
      store,
    },
  });
  mock.module(periodModulePath, {
    namedExports: {
      getPeriodString,
      getTodayISODate,
    },
  });
  mock.module(messageModulePath, {
    namedExports: { getErrorMessage },
  });

  return import(`${indexModulePath}?${suffix}`);
}

afterEach(() => {
  mock.restoreAll();
  mock.timers.reset();
});

describe('mosobleirc fetch', () => {
  it('logs persisted PDF fetch failures separately before falling back', async () => {
    mock.timers.enable({
      apis: ['Date'],
      now: new Date('2026-05-13T12:00:00.000Z'),
    });

    const cached = [{ text: 'cached result', value: 123 }];
    const fetchPdfError = new Error('s3 unavailable');
    const log = mock.method(console, 'log', () => {});
    const { fetch } = await importMosOblFetch(
      {
        fetchPdf: async () => {
          throw fetchPdfError;
        },
        fetchStore: async () => cached,
      },
      'log-persisted-pdf-fetch-failure',
    );

    const result = await fetch();

    assert.deepEqual(result, cached);
    assert.strictEqual(log.mock.calls.length, 1);
    assert.deepEqual(log.mock.calls[0].arguments, [
      'MosOblEIRC persisted PDF fetch for period 04-2026 failed.',
      fetchPdfError,
    ]);
  });

  it('falls back to cached data when PDF parsing fails', async () => {
    mock.timers.enable({
      apis: ['Date'],
      now: new Date('2026-05-13T12:00:00.000Z'),
    });

    const cached = [{ text: 'cached result', value: 123 }];
    let apiCalls = 0;
    const { fetch } = await importMosOblFetch(
      {
        fetchStore: async () => cached,
        fetchCharges: async () => {
          apiCalls += 1;
          return [];
        },
      },
      'fallback-to-cache',
    );

    const result = await fetch();

    assert.deepEqual(result, cached);
    assert.strictEqual(apiCalls, 0);
  });

  it('logs persisted PDF parse or render failures separately before falling back', async () => {
    mock.timers.enable({
      apis: ['Date'],
      now: new Date('2026-05-13T12:00:00.000Z'),
    });

    const cached = [{ text: 'cached result', value: 123 }];
    const renderError = new Error('message assembly failed');
    const log = mock.method(console, 'log', () => {});
    const { fetch } = await importMosOblFetch(
      {
        parsePdfToChargeData: async () => ({ chargeDetails: [] }),
        parseCharges: async () => [],
        appendPdfMessage: () => {
          throw renderError;
        },
        fetchStore: async () => cached,
      },
      'log-persisted-pdf-parse-render-failure',
    );

    const result = await fetch();

    assert.deepEqual(result, cached);
    assert.strictEqual(log.mock.calls.length, 1);
    assert.deepEqual(log.mock.calls[0].arguments, [
      'MosOblEIRC persisted PDF parse/render for period 04-2026 failed.',
      renderError,
    ]);
  });

  it('awaits parsed API fallback data before storing and returning it', async () => {
    mock.timers.enable({
      apis: ['Date'],
      now: new Date('2026-05-13T12:00:00.000Z'),
    });

    const parsed = [{ text: 'api fallback', value: 456 }];
    const storeCalls = [];
    const { fetch } = await importMosOblFetch(
      {
        fetchStore: async () => undefined,
        fetchCharges: async () => ({ chargeDetails: [{ id: 1 }] }),
        parseCharges: async () => {
          await Promise.resolve();
          return parsed;
        },
        store: async (period, record) => {
          storeCalls.push({ period, record, isPromise: record instanceof Promise });
        },
      },
      'await-parsed-api-fallback',
    );

    const result = await fetch();

    assert.deepEqual(result, parsed);
    assert.deepEqual(storeCalls, [
      {
        period: '04-2026',
        record: parsed,
        isPromise: false,
      },
    ]);
  });

  it('returns cached JSON data during off-hours before blocking live API fetches', async () => {
    mock.timers.enable({
      apis: ['Date'],
      now: new Date('2026-05-13T01:00:00.000Z'),
    });

    const cached = [{ text: 'cached off-hours result', value: 321 }];
    let apiCalls = 0;
    const { fetch } = await importMosOblFetch(
      {
        fetchPdf: async () => Buffer.alloc(0),
        fetchStore: async () => cached,
        fetchCharges: async () => {
          apiCalls += 1;
          return [];
        },
      },
      'cached-off-hours-before-api-gate',
    );

    const result = await fetch();

    assert.deepEqual(result, cached);
    assert.strictEqual(apiCalls, 0);
  });

  it('returns parsed live data even when caching that data fails', async () => {
    mock.timers.enable({
      apis: ['Date'],
      now: new Date('2026-05-13T12:00:00.000Z'),
    });

    const parsed = [{ text: 'live result', value: 654 }];
    const { fetch } = await importMosOblFetch(
      {
        fetchPdf: async () => Buffer.alloc(0),
        fetchStore: async () => undefined,
        fetchCharges: async () => ({ chargeDetails: [{ id: 1 }] }),
        parseCharges: async () => parsed,
        store: async () => {
          throw new Error('cache write failed');
        },
      },
      'return-live-data-when-cache-write-fails',
    );

    const result = await fetch();

    assert.deepEqual(result, parsed);
  });

  it('returns live data when cached JSON lookup fails before API fallback', async () => {
    mock.timers.enable({
      apis: ['Date'],
      now: new Date('2026-05-13T12:00:00.000Z'),
    });

    const parsed = [{ text: 'live result after cache read failure', value: 777 }];
    const { fetch } = await importMosOblFetch(
      {
        fetchPdf: async () => Buffer.alloc(0),
        fetchStore: async () => {
          throw new Error('cache read failed');
        },
        fetchCharges: async () => ({ chargeDetails: [{ id: 1 }] }),
        parseCharges: async () => parsed,
        store: async () => undefined,
      },
      'return-live-data-when-cache-read-fails',
    );

    const result = await fetch();

    assert.deepEqual(result, parsed);
  });
});

describe('mosobleirc store', () => {
  it('persists resolved JSON records instead of promise placeholders', async () => {
    const s3Calls = [];

    mock.module(s3ModulePath, {
      namedExports: {
        fetch: async () => Buffer.from('{}'),
        store: async (body, filename) => {
          s3Calls.push({ body, filename });
        },
      },
    });

    const { store } = await import(`${storeModulePath}?store-resolved-record`);
    const record = [{ text: 'stored result', value: 789 }];

    await store('04-2026', Promise.resolve(record));

    assert.deepEqual(s3Calls, [
      {
        body: JSON.stringify({ '04-2026': record }),
        filename: 'mosobleirc.json',
      },
    ]);
  });
});
