import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { resolve } from 'node:path';

const handlerPath = resolve(import.meta.dirname, '../store-pdf.js');
const fetchModulePath = resolve(import.meta.dirname, '../../src/mosenergo-bill-store/fetch.js');
const parsePdfModulePath = resolve(import.meta.dirname, '../../src/shared/parse-pdf.js');
const blobModulePath = resolve(import.meta.dirname, '../../src/shared/blob.js');

afterEach(() => mock.restoreAll());

function makeReq(body, authHeader) {
  return {
    method: 'POST',
    headers: { authorization: authHeader ?? '' },
    body,
  };
}

function makeRes() {
  const calls = [];
  const res = {
    calls,
    status(code) { calls.push({ type: 'status', code }); return res; },
    json(body) { calls.push({ type: 'json', body }); return res; },
  };
  return res;
}

async function importHandler(
  {
    downloadInvoice = async () => Buffer.from('pdf'),
    getFilenameFromPdf = async () => 'mosobleirc-05-2026.pdf',
    getStringsFromPdf = async () => [],
    store = async () => {},
  } = {},
  suffix,
) {
  mock.module(fetchModulePath, { namedExports: { downloadInvoice } });
  mock.module(parsePdfModulePath, { namedExports: { getFilenameFromPdf, getStringsFromPdf } });
  mock.module(blobModulePath, { namedExports: { store } });
  return import(`${handlerPath}?${suffix}`);
}

describe('store-pdf handler', () => {
  it('returns 405 for non-POST requests', async () => {
    const { default: handler } = await import(`${handlerPath}?method-check`);
    const req = { method: 'GET', headers: {}, body: {} };
    const res = makeRes();
    await handler(req, res);
    assert.deepEqual(res.calls, [
      { type: 'status', code: 405 },
      { type: 'json', body: { error: 'Method not allowed' } },
    ]);
  });

  it('returns 401 when secret mismatch', async () => {
    process.env.STORE_PDF_SECRET = 'correct-secret';
    const { default: handler } = await import(`${handlerPath}?auth-check`);
    const req = makeReq({ url: 'https://example.com/x.pdf', type: 'MOSOBLEIRC' }, 'Bearer wrong');
    const res = makeRes();
    await handler(req, res);
    delete process.env.STORE_PDF_SECRET;
    assert.deepEqual(res.calls, [
      { type: 'status', code: 401 },
      { type: 'json', body: { error: 'Unauthorized' } },
    ]);
  });

  it('returns 400 when url or type missing', async () => {
    const { default: handler } = await importHandler({}, 'missing-fields');
    const res = makeRes();
    await handler(makeReq({ url: 'https://example.com/x.pdf' }), res);
    assert.deepEqual(res.calls, [
      { type: 'status', code: 400 },
      { type: 'json', body: { error: 'url and type are required' } },
    ]);
  });

  it('skips storing for MOSENERGO non-Trehgorka PDFs', async () => {
    const stores = [];
    const { default: handler } = await importHandler(
      { getStringsFromPdf: async () => ['some other account'], store: async (...a) => stores.push(a) },
      'mosenergo-not-trehgorka',
    );
    const res = makeRes();
    await handler(makeReq({ url: 'https://example.com/x.pdf', type: 'MOSENERGO' }), res);
    assert.deepEqual(stores, []);
    assert.deepEqual(res.calls, [
      { type: 'status', code: 200 },
      { type: 'json', body: { ok: true, skipped: true } },
    ]);
  });

  it('stores and returns filename for MOSENERGO Trehgorka PDFs', async () => {
    const stores = [];
    const { default: handler } = await importHandler(
      {
        getStringsFromPdf: async () => ['023221017850'],
        getFilenameFromPdf: async () => 'electricity-05-2026.pdf',
        store: async (buf, filename) => stores.push({ filename }),
      },
      'mosenergo-trehgorka',
    );
    const res = makeRes();
    await handler(makeReq({ url: 'https://example.com/x.pdf', type: 'MOSENERGO' }), res);
    assert.deepEqual(stores, [{ filename: 'electricity-05-2026.pdf' }]);
    assert.deepEqual(res.calls, [
      { type: 'status', code: 200 },
      { type: 'json', body: { ok: true, filename: 'electricity-05-2026.pdf' } },
    ]);
  });

  it('stores and returns filename for MOSOBLEIRC PDFs without validation', async () => {
    const stores = [];
    const { default: handler } = await importHandler(
      {
        getFilenameFromPdf: async () => 'mosobleirc-05-2026.pdf',
        store: async (buf, filename) => stores.push({ filename }),
      },
      'mosobleirc-store',
    );
    const res = makeRes();
    await handler(makeReq({ url: 'https://example.com/x.pdf', type: 'MOSOBLEIRC' }), res);
    assert.deepEqual(stores, [{ filename: 'mosobleirc-05-2026.pdf' }]);
    assert.deepEqual(res.calls, [
      { type: 'status', code: 200 },
      { type: 'json', body: { ok: true, filename: 'mosobleirc-05-2026.pdf' } },
    ]);
  });

  it('returns 422 when filename extraction fails', async () => {
    const { default: handler } = await importHandler(
      { getFilenameFromPdf: async () => '' },
      'filename-extraction-fails',
    );
    const res = makeRes();
    await handler(makeReq({ url: 'https://example.com/x.pdf', type: 'MOSOBLEIRC' }), res);
    assert.deepEqual(res.calls, [
      { type: 'status', code: 422 },
      { type: 'json', body: { error: 'Cannot extract filename from PDF' } },
    ]);
  });
});
