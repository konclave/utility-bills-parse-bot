import { describe, it, mock, before, after } from 'node:test';
import assert from 'node:assert/strict';

describe('fetch-electricity', () => {
  let fetchFn;
  const mockPdfBuffer = Buffer.from('%PDF-1.4 mock-electricity-pdf');

  // Configurable login response so individual tests can override it.
  let loginResponseData = { session: 'test-session-token' };

  before(async () => {
    const mockClient = Object.assign(
      async (options) => {
        if (options.url === '/gate_lkcomu' && options.params?.action === 'auth') {
          return { data: { data: [loginResponseData] } };
        }
        if (options.url === '/gate_lkcomu' && options.params?.action === 'sql') {
          return { data: { data: [{ vl_params: '{"key":"value"}' }] } };
        }
        if (options.url === '/printServ') {
          return { data: mockPdfBuffer };
        }
        throw new Error(
          `Unexpected call: ${JSON.stringify({ url: options.url, action: options.params?.action })}`,
        );
      },
      {
        defaults: { headers: { common: {} } },
        get: async (url) => {
          if (url === '/auth') {
            return {
              headers: { 'set-cookie': ['session-cookie=sess-abc; path=/; HttpOnly'] },
            };
          }
          throw new Error(`Unexpected GET url: ${url}`);
        },
      },
    );

    mock.module('axios', {
      defaultExport: { create: () => mockClient },
    });

    ({ fetch: fetchFn } = await import('../fetch-electricity.js'));
  });

  after(() => mock.restoreAll());

  it('throws when MOSENERGO_LOGIN env var is missing', async () => {
    const savedLogin = process.env.MOSENERGO_LOGIN;
    const savedPassword = process.env.MOSENERGO_PASSWORD;
    delete process.env.MOSENERGO_LOGIN;
    process.env.MOSENERGO_PASSWORD = 'pass';
    try {
      await fetchFn();
      assert.fail('Expected error to be thrown');
    } catch (e) {
      assert.equal(e.message, 'Username is missing!');
    } finally {
      if (savedLogin !== undefined) process.env.MOSENERGO_LOGIN = savedLogin;
      else delete process.env.MOSENERGO_LOGIN;
      if (savedPassword !== undefined) process.env.MOSENERGO_PASSWORD = savedPassword;
      else delete process.env.MOSENERGO_PASSWORD;
    }
  });

  it('throws when MOSENERGO_PASSWORD env var is missing', async () => {
    const savedLogin = process.env.MOSENERGO_LOGIN;
    const savedPassword = process.env.MOSENERGO_PASSWORD;
    process.env.MOSENERGO_LOGIN = 'user';
    delete process.env.MOSENERGO_PASSWORD;
    try {
      await fetchFn();
      assert.fail('Expected error to be thrown');
    } catch (e) {
      assert.equal(e.message, 'Password is missing!');
    } finally {
      if (savedLogin !== undefined) process.env.MOSENERGO_LOGIN = savedLogin;
      else delete process.env.MOSENERGO_LOGIN;
      if (savedPassword !== undefined) process.env.MOSENERGO_PASSWORD = savedPassword;
      else delete process.env.MOSENERGO_PASSWORD;
    }
  });

  it('throws when the provider login response has no session', async () => {
    const savedLogin = process.env.MOSENERGO_LOGIN;
    const savedPassword = process.env.MOSENERGO_PASSWORD;
    process.env.MOSENERGO_LOGIN = 'user';
    process.env.MOSENERGO_PASSWORD = 'pass';
    loginResponseData = { nm_result: 'Invalid credentials' };
    try {
      await fetchFn();
      assert.fail('Expected error to be thrown');
    } catch (e) {
      assert.match(e.message, /Login to Mosenergosbyt failed/);
    } finally {
      loginResponseData = { session: 'test-session-token' };
      if (savedLogin !== undefined) process.env.MOSENERGO_LOGIN = savedLogin;
      else delete process.env.MOSENERGO_LOGIN;
      if (savedPassword !== undefined) process.env.MOSENERGO_PASSWORD = savedPassword;
      else delete process.env.MOSENERGO_PASSWORD;
    }
  });

  it('returns a raw PDF Buffer without any S3 interaction', async () => {
    const savedLogin = process.env.MOSENERGO_LOGIN;
    const savedPassword = process.env.MOSENERGO_PASSWORD;
    process.env.MOSENERGO_LOGIN = 'testuser';
    process.env.MOSENERGO_PASSWORD = 'testpass';
    try {
      const result = await fetchFn();
      assert.ok(Buffer.isBuffer(result), 'result should be a Buffer');
      assert.ok(result.length > 0, 'result should be non-empty');
      assert.deepEqual(result, mockPdfBuffer);
    } finally {
      if (savedLogin !== undefined) process.env.MOSENERGO_LOGIN = savedLogin;
      else delete process.env.MOSENERGO_LOGIN;
      if (savedPassword !== undefined) process.env.MOSENERGO_PASSWORD = savedPassword;
      else delete process.env.MOSENERGO_PASSWORD;
    }
  });
});
