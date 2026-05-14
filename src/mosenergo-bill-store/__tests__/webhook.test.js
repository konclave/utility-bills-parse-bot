import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

const storeModulePath = resolve(import.meta.dirname, '../index.js');
const fetchModulePath = resolve(import.meta.dirname, '../fetch.js');
const parsePdfModulePath = resolve(import.meta.dirname, '../../shared/parse-pdf.js');
const s3ModulePath = resolve(import.meta.dirname, '../../shared/s3.js');
const rootModulePath = resolve(import.meta.dirname, '../../../index.js');
const botModulePath = resolve(import.meta.dirname, '../../bot/index.js');
const devServerModulePath = resolve(import.meta.dirname, '../../dev-server.js');

async function importWebhookCallback(
  {
    downloadInvoice = async () => Buffer.from('pdf'),
    getFilenameFromPdf = async () => '',
    getStringsFromPdf = async () => ['mosenergo invoice'],
    purgeStorage = async () => undefined,
    store = async () => undefined,
  } = {},
  suffix,
) {
  mock.module(fetchModulePath, {
    namedExports: { downloadInvoice },
  });
  mock.module(parsePdfModulePath, {
    namedExports: { getFilenameFromPdf, getStringsFromPdf },
  });
  mock.module(s3ModulePath, {
    namedExports: { purgeStorage, store },
  });

  return import(`${storeModulePath}?${suffix}`);
}

async function importStoreHandler(webhookCallback, suffix) {
  mock.module(resolve(import.meta.dirname, '../index.js'), {
    namedExports: { webhookCallback },
  });
  mock.module(botModulePath, {
    namedExports: {
      init: () => ({
        handleUpdate: async () => undefined,
      }),
    },
  });
  mock.module(devServerModulePath, {
    namedExports: {
      startLocalServer: async () => undefined,
    },
  });

  return import(`${rootModulePath}?${suffix}`);
}

afterEach(() => {
  mock.restoreAll();
});

describe('webhookCallback', () => {
  it('rejects when filename detection fails instead of resolving with an Error object', async () => {
    const s3Calls = [];
    const { webhookCallback } = await importWebhookCallback(
      {
        getStringsFromPdf: async () => ['023221017850'],
        purgeStorage: async (...args) => {
          s3Calls.push({ method: 'purgeStorage', args });
        },
        store: async (...args) => {
          s3Calls.push({ method: 'store', args });
        },
      },
      'webhook-filename-failure',
    );

    await assert.rejects(
      webhookCallback({
        body: JSON.stringify({
          payload: { invoiceLinkUrl: 'https://example.com/invoice.pdf' },
        }),
      }),
      {
        message: 'Cannot get the filename from the PDF: https://example.com/invoice.pdf',
      },
    );

    assert.deepEqual(s3Calls, []);
  });
});

describe('storeHandler', () => {
  it('propagates webhook ingestion failures instead of returning a success response', async () => {
    const error = new Error('Cannot get the filename from the PDF: https://example.com/invoice.pdf');
    const { storeHandler } = await importStoreHandler(
      async () => {
        throw error;
      },
      'store-handler-propagates-webhook-error',
    );

    await assert.rejects(storeHandler({ body: '{}' }), error);
  });
});
