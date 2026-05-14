import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { setImmediate as waitForTurn } from 'node:timers/promises';

const callbackModulePath = resolve(import.meta.dirname, '../callback.js');
const processingModulePath = resolve(import.meta.dirname, '../processing.js');

function createCtx() {
  const replies = [];

  return {
    replies,
    reply: async (message, options) => {
      replies.push({ method: 'reply', message, options });
    },
    replyWithDocument: async (document) => {
      replies.push({ method: 'replyWithDocument', document });
    },
    replyWithMediaGroup: async (media) => {
      replies.push({ method: 'replyWithMediaGroup', media });
    },
  };
}

async function importCallback(namedExports, suffix) {
  mock.module(processingModulePath, { namedExports });
  return import(`${callbackModulePath}?${suffix}`);
}

function serializeError(error) {
  if (error instanceof Error) {
    return JSON.stringify({
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    });
  }

  return JSON.stringify(error);
}

afterEach(() => {
  mock.restoreAll();
});

describe('callback', () => {
  it('sends one wait message, one summary reply, and one media group for attachments', async () => {
    const { callback } = await importCallback(
      {
        getValues: async () => ({
          text: '🏠 Трёхгорка\nTotal: 100 ₽',
          attachments: [
            { fileTitle: 'water.pdf', fileBuffer: Buffer.from('1') },
            { fileTitle: 'electricity.pdf', fileBuffer: Buffer.from('2') },
          ],
        }),
      },
      'aggregated-delivery',
    );

    const ctx = createCtx();
    await callback(ctx, { venue: 'T' });

    assert.deepEqual(ctx.replies, [
      { method: 'reply', message: '⏳ Wait for it...', options: undefined },
      {
        method: 'reply',
        message: '🏠 Трёхгорка\nTotal: 100 ₽',
        options: { parse_mode: 'HTML' },
      },
      {
        method: 'replyWithMediaGroup',
        media: [
          {
            type: 'document',
            media: {
              filename: 'water.pdf',
              source: Buffer.from('1'),
            },
          },
          {
            type: 'document',
            media: {
              filename: 'electricity.pdf',
              source: Buffer.from('2'),
            },
          },
        ],
      },
    ]);
  });

  it('replies with the generic error for uncaught getValues failures and includes useful debug details only for that request', async () => {
    const error = new Error('boom');
    const { callback } = await importCallback(
      {
        getValues: async () => {
          throw error;
        },
      },
      'uncaught-get-values-error',
    );

    const debugCtx = createCtx();
    await callback(debugCtx, { debug: true });

    assert.deepEqual(debugCtx.replies, [
      { method: 'reply', message: '⏳ Wait for it...', options: undefined },
      {
        method: 'reply',
        message: '💥 Ошибка. Не удалось получить данные.',
        options: undefined,
      },
      { method: 'reply', message: serializeError(error), options: undefined },
    ]);

    const plainCtx = createCtx();
    await callback(plainCtx);

    assert.deepEqual(plainCtx.replies, [
      { method: 'reply', message: '⏳ Wait for it...', options: undefined },
      {
        method: 'reply',
        message: '💥 Ошибка. Не удалось получить данные.',
        options: undefined,
      },
    ]);
  });

  it('keeps uncaught error debug replies request-scoped across overlapping callbacks', async () => {
    const pending = new Map();
    const { callback } = await importCallback(
      {
        getValues: async ({ venue }) => {
          return new Promise((resolve, reject) => {
            pending.set(venue, { resolve, reject });
          });
        },
      },
      'request-scoped-uncaught-error',
    );

    const plainCtx = createCtx();
    const debugCtx = createCtx();
    const plainError = new Error('plain failure');
    const debugError = new Error('debug failure');

    const plainRequest = callback(plainCtx, { debug: false, venue: 'plain' });
    const debugRequest = callback(debugCtx, { debug: true, venue: 'debug' });

    await waitForTurn();

    pending.get('plain').reject(plainError);
    pending.get('debug').reject(debugError);
    await Promise.all([plainRequest, debugRequest]);

    assert.deepEqual(
      plainCtx.replies.map(({ message }) => message),
      ['⏳ Wait for it...', '💥 Ошибка. Не удалось получить данные.'],
    );
    assert.deepEqual(
      debugCtx.replies.map(({ message }) => message),
      [
        '⏳ Wait for it...',
        '💥 Ошибка. Не удалось получить данные.',
        serializeError(debugError),
      ],
    );
  });
});
