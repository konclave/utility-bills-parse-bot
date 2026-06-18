import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

const storeModulePath = resolve(import.meta.dirname, '../index.js');
const rootModulePath = resolve(import.meta.dirname, '../../../index.js');
const botModulePath = resolve(import.meta.dirname, '../../bot/index.js');
const devServerModulePath = resolve(import.meta.dirname, '../../dev-server.js');

afterEach(() => mock.restoreAll());

async function importWebhookCallback(fetchImpl, suffix) {
  mock.method(globalThis, 'fetch', fetchImpl);
  return import(`${storeModulePath}?${suffix}`);
}

async function importStoreHandler(webhookCallback, suffix) {
  mock.module(storeModulePath, { namedExports: { webhookCallback } });
  mock.module(botModulePath, {
    namedExports: { init: () => ({ handleUpdate: async () => undefined }) },
  });
  mock.module(devServerModulePath, {
    namedExports: { startLocalServer: async () => undefined },
  });
  return import(`${rootModulePath}?${suffix}`);
}

describe('webhookCallback', () => {
  it('POSTs the invoice URL and type to the Vercel store-pdf endpoint', async () => {
    process.env.VERCEL_STORE_PDF_URL = 'https://app.vercel.app/api/store-pdf';
    process.env.STORE_PDF_SECRET = 'secret123';

    const fetchCalls = [];
    const { webhookCallback } = await importWebhookCallback(
      async (url, options) => {
        fetchCalls.push({ url, options });
        return { ok: true, text: async () => '{"ok":true}' };
      },
      'posts-to-vercel',
    );

    await webhookCallback({
      body: JSON.stringify({ payload: { invoiceLinkUrl: 'https://example.com/invoice.pdf' } }),
    });

    delete process.env.VERCEL_STORE_PDF_URL;
    delete process.env.STORE_PDF_SECRET;

    assert.strictEqual(fetchCalls.length, 1);
    assert.strictEqual(fetchCalls[0].url, 'https://app.vercel.app/api/store-pdf');
    assert.deepEqual(JSON.parse(fetchCalls[0].options.body), {
      url: 'https://example.com/invoice.pdf',
      type: 'MOSENERGO',
    });
    assert.strictEqual(fetchCalls[0].options.headers['Authorization'], 'Bearer secret123');
  });

  it('throws when VERCEL_STORE_PDF_URL is not set', async () => {
    delete process.env.VERCEL_STORE_PDF_URL;
    const { webhookCallback } = await importWebhookCallback(
      async () => ({ ok: true }),
      'no-url-env-var',
    );

    await assert.rejects(
      webhookCallback({
        body: JSON.stringify({ payload: { invoiceLinkUrl: 'https://example.com/invoice.pdf' } }),
      }),
      { message: 'VERCEL_STORE_PDF_URL is not configured' },
    );
  });

  it('throws when the store-pdf endpoint returns an error', async () => {
    process.env.VERCEL_STORE_PDF_URL = 'https://app.vercel.app/api/store-pdf';
    const { webhookCallback } = await importWebhookCallback(
      async () => ({ ok: false, status: 500, text: async () => 'Internal error' }),
      'endpoint-error',
    );

    await assert.rejects(
      webhookCallback({
        body: JSON.stringify({ payload: { invoiceLinkUrl: 'https://example.com/invoice.pdf' } }),
      }),
      { message: 'store-pdf endpoint failed: 500 Internal error' },
    );

    delete process.env.VERCEL_STORE_PDF_URL;
  });
});

describe('storeHandler', () => {
  it('propagates webhook ingestion failures', async () => {
    const error = new Error('store-pdf endpoint failed: 500 Internal error');
    const { storeHandler } = await importStoreHandler(
      async () => { throw error; },
      'store-handler-propagates-error',
    );
    await assert.rejects(storeHandler({ body: '{}' }), error);
  });
});
