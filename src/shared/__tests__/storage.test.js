import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { resolve } from 'node:path';

const storageModulePath = resolve(import.meta.dirname, '../storage.js');
const vercelBlobModulePath = resolve(import.meta.dirname, '../../../node_modules/@vercel/blob/dist/index.js');

afterEach(() => mock.restoreAll());

describe('storage.store', () => {
  it('calls put with access public and no random suffix', async () => {
    const puts = [];
    mock.module(vercelBlobModulePath, {
      namedExports: {
        put: async (filename, buffer, opts) => { puts.push({ filename, buffer, opts }); },
        list: async () => ({ blobs: [] }),
        del: async () => {},
      },
    });

    const { store } = await import(`${storageModulePath}?store-calls-put`);
    const buf = Buffer.from('pdf data');
    await store(buf, 'mosobleirc-05-2026.pdf');

    assert.deepEqual(puts, [{
      filename: 'mosobleirc-05-2026.pdf',
      buffer: buf,
      opts: { access: 'public', addRandomSuffix: false },
    }]);
  });
});

describe('storage.fetch', () => {
  it('returns buffer when blob exists', async () => {
    const fakeBuffer = Buffer.from('pdf content');
    mock.module(vercelBlobModulePath, {
      namedExports: {
        put: async () => {},
        list: async ({ prefix }) => ({
          blobs: [{ pathname: prefix, url: 'https://blob.vercel.com/test.pdf' }],
        }),
        del: async () => {},
      },
    });
    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      arrayBuffer: async () => fakeBuffer.buffer.slice(
        fakeBuffer.byteOffset,
        fakeBuffer.byteOffset + fakeBuffer.length,
      ),
    }));

    const { fetch } = await import(`${storageModulePath}?fetch-found`);
    const result = await fetch('mosobleirc-05-2026.pdf');

    assert.deepEqual(result, fakeBuffer);
  });

  it('returns null when blob does not exist', async () => {
    mock.module(vercelBlobModulePath, {
      namedExports: {
        put: async () => {},
        list: async () => ({ blobs: [] }),
        del: async () => {},
      },
    });

    const { fetch } = await import(`${storageModulePath}?fetch-not-found`);
    const result = await fetch('mosobleirc-05-2026.pdf');

    assert.strictEqual(result, null);
  });

  it('returns null on any error (e.g. list throws)', async () => {
    mock.module(vercelBlobModulePath, {
      namedExports: {
        put: async () => {},
        list: async () => { throw new Error('network error'); },
        del: async () => {},
      },
    });

    const { fetch } = await import(`${storageModulePath}?fetch-error`);
    const result = await fetch('mosobleirc-05-2026.pdf');

    assert.strictEqual(result, null);
  });
});

describe('storage.purge', () => {
  it('deletes blobs beyond the keep count, keeping newest by MM-YYYY period', async () => {
    const deleted = [];
    mock.module(vercelBlobModulePath, {
      namedExports: {
        put: async () => {},
        list: async () => ({
          blobs: [
            { pathname: 'mosobleirc-charges-03-2026.json', url: 'https://blob/03-2026' },
            { pathname: 'mosobleirc-charges-01-2026.json', url: 'https://blob/01-2026' },
            { pathname: 'mosobleirc-charges-12-2025.json', url: 'https://blob/12-2025' },
            { pathname: 'mosobleirc-charges-05-2026.json', url: 'https://blob/05-2026' },
          ],
        }),
        del: async (urls) => { deleted.push(...(Array.isArray(urls) ? urls : [urls])); },
      },
    });

    const { purge } = await import(`${storageModulePath}?purge-deletes-old`);
    await purge('mosobleirc-charges-', 2);

    assert.strictEqual(deleted.length, 2);
    assert.ok(deleted.includes('https://blob/01-2026'));
    assert.ok(deleted.includes('https://blob/12-2025'));
    assert.ok(!deleted.includes('https://blob/05-2026'));
    assert.ok(!deleted.includes('https://blob/03-2026'));
  });

  it('correctly sorts across year boundaries (Jan 2026 is newer than Dec 2025)', async () => {
    const deleted = [];
    mock.module(vercelBlobModulePath, {
      namedExports: {
        put: async () => {},
        list: async () => ({
          blobs: [
            { pathname: 'mosobleirc-charges-01-2026.json', url: 'https://blob/01-2026' },
            { pathname: 'mosobleirc-charges-12-2025.json', url: 'https://blob/12-2025' },
          ],
        }),
        del: async (urls) => { deleted.push(...(Array.isArray(urls) ? urls : [urls])); },
      },
    });

    const { purge } = await import(`${storageModulePath}?purge-year-boundary`);
    await purge('mosobleirc-charges-', 1);

    assert.deepEqual(deleted, ['https://blob/12-2025']);
  });

  it('does not call del when blob count is within the keep limit', async () => {
    const deleted = [];
    mock.module(vercelBlobModulePath, {
      namedExports: {
        put: async () => {},
        list: async () => ({
          blobs: [
            { pathname: 'mosobleirc-charges-05-2026.json', url: 'https://blob/05-2026' },
          ],
        }),
        del: async (urls) => { deleted.push(urls); },
      },
    });

    const { purge } = await import(`${storageModulePath}?purge-no-del`);
    await purge('mosobleirc-charges-', 12);

    assert.strictEqual(deleted.length, 0);
  });

  it('logs and does not throw when list fails', async () => {
    const errors = [];
    mock.module(vercelBlobModulePath, {
      namedExports: {
        put: async () => {},
        list: async () => { throw new Error('network error'); },
        del: async () => {},
      },
    });
    mock.method(console, 'error', (...args) => errors.push(args));

    const { purge } = await import(`${storageModulePath}?purge-logs-error`);
    await assert.doesNotReject(() => purge('mosobleirc-charges-', 12));
    assert.ok(errors.some((args) => String(args[0]).includes('[storage.purge]')));
  });
});
