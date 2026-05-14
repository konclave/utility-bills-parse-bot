import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

const originalBotToken = process.env.BOT_TOKEN;

afterEach(() => {
  if (originalBotToken === undefined) {
    delete process.env.BOT_TOKEN;
    return;
  }

  process.env.BOT_TOKEN = originalBotToken;
});

describe('requiredEnv', () => {
  it('returns the configured value when the env var is present', async () => {
    process.env.BOT_TOKEN = 'telegram-token';
    const { requiredEnv } = await import('../config.js');

    assert.equal(requiredEnv('BOT_TOKEN'), 'telegram-token');
  });

  it('throws when the env var is missing', async () => {
    delete process.env.BOT_TOKEN;
    const { requiredEnv } = await import('../config.js');

    assert.throws(() => requiredEnv('BOT_TOKEN'), {
      message: 'Missing required environment variable: BOT_TOKEN',
    });
  });

  it('throws when the env var is an empty string', async () => {
    process.env.BOT_TOKEN = '';
    const { requiredEnv } = await import('../config.js');

    assert.throws(() => requiredEnv('BOT_TOKEN'), {
      message: 'Missing required environment variable: BOT_TOKEN',
    });
  });
});
