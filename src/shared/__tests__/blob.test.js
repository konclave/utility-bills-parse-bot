import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { resolve } from 'node:path';

const blobModulePath = resolve(import.meta.dirname, '../blob.js');
const vercelBlobModulePath = resolve(import.meta.dirname, '../../../node_modules/@vercel/blob/dist/index.js');

afterEach(() => mock.restoreAll());

describe('blob.store', () => {
  it('calls put with access public and no random suffix', async () => {
    const puts = [];
    mock.module(vercelBlobModulePath, {
      namedExports: {
        put: async (filename, buffer, opts) => {
          puts.push({ filename, buffer, opts });
        },
        list: async () => ({ blobs: [] }),
      },
    });

    const { store } = await import(`${blobModulePath}?store-calls-put`);
    const buf = Buffer.from('pdf data');
    await store(buf, 'mosobleirc-05-2026.pdf');

    assert.deepEqual(puts, [
      {
        filename: 'mosobleirc-05-2026.pdf',
        buffer: buf,
        opts: { access: 'public', addRandomSuffix: false },
      },
    ]);
  });
});

describe('blob.fetchByName', () => {
  it('returns buffer when blob exists', async () => {
    const fakeBuffer = Buffer.from('pdf content');
    mock.module(vercelBlobModulePath, {
      namedExports: {
        put: async () => {},
        list: async ({ prefix }) => ({
          blobs: [{ pathname: prefix, url: 'https://blob.vercel.com/mosobleirc-05-2026.pdf' }],
        }),
      },
    });
    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      arrayBuffer: async () => fakeBuffer.buffer.slice(fakeBuffer.byteOffset, fakeBuffer.byteOffset + fakeBuffer.length),
    }));

    const { fetchByName } = await import(`${blobModulePath}?fetch-found`);
    const result = await fetchByName('mosobleirc-05-2026.pdf');

    assert.deepEqual(result, fakeBuffer);
  });

  it('returns null when blob does not exist', async () => {
    mock.module(vercelBlobModulePath, {
      namedExports: {
        put: async () => {},
        list: async () => ({ blobs: [] }),
      },
    });

    const { fetchByName } = await import(`${blobModulePath}?fetch-not-found`);
    const result = await fetchByName('mosobleirc-05-2026.pdf');

    assert.strictEqual(result, null);
  });
});
