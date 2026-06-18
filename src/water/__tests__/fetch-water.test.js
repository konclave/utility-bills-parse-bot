import { describe, it, mock, before, after } from 'node:test';
import assert from 'node:assert/strict';

const ACCOUNT_HTML = `
<div id="billings">
  <table>
    <tr><td>
      <input name="tt" value="tt-test-token">
      <input type="submit">
    </td></tr>
  </table>
</div>`;

const LOGIN_HTML = `<html><body>
  <input name="_csrf" value="csrf-token">
</body></html>`;

describe('fetch-water', () => {
  let fetchFn;
  const mockPdfBuffer = Buffer.from('%PDF-1.4 mock-water-pdf');

  before(async () => {
    const mockClient = Object.assign(
      async (options) => {
        if (options.url === '/login') return { data: ACCOUNT_HTML };
        if (options.url === '/invoice') return { data: mockPdfBuffer };
        throw new Error(`Unexpected POST url: ${options.url}`);
      },
      {
        defaults: { headers: { common: {} } },
        get: async (url) => {
          if (url === '/')
            return {
              headers: { 'set-cookie': ['session=abc; path=/'] },
              data: LOGIN_HTML,
            };
          throw new Error(`Unexpected GET url: ${url}`);
        },
      },
    );

    mock.module('axios', {
      defaultExport: { create: () => mockClient },
    });

    ({ fetch: fetchFn } = await import('../fetch-water.js'));
  });

  after(() => mock.restoreAll());

  it('throws when LOGIN env var is missing', async () => {
    const savedLogin = process.env.LOGIN;
    const savedPassword = process.env.PASSWORD;
    delete process.env.LOGIN;
    process.env.PASSWORD = 'pass';
    try {
      await fetchFn();
      assert.fail('Expected error to be thrown');
    } catch (e) {
      assert.equal(e.message, 'Username is missing!');
    } finally {
      if (savedLogin !== undefined) process.env.LOGIN = savedLogin;
      else delete process.env.LOGIN;
      if (savedPassword !== undefined) process.env.PASSWORD = savedPassword;
      else delete process.env.PASSWORD;
    }
  });

  it('throws when PASSWORD env var is missing', async () => {
    const savedLogin = process.env.LOGIN;
    const savedPassword = process.env.PASSWORD;
    process.env.LOGIN = 'user';
    delete process.env.PASSWORD;
    try {
      await fetchFn();
      assert.fail('Expected error to be thrown');
    } catch (e) {
      assert.equal(e.message, 'Password is missing!');
    } finally {
      if (savedLogin !== undefined) process.env.LOGIN = savedLogin;
      else delete process.env.LOGIN;
      if (savedPassword !== undefined) process.env.PASSWORD = savedPassword;
      else delete process.env.PASSWORD;
    }
  });

  it('returns a raw PDF Buffer without any S3 interaction', async () => {
    const savedLogin = process.env.LOGIN;
    const savedPassword = process.env.PASSWORD;
    process.env.LOGIN = 'testuser';
    process.env.PASSWORD = 'testpass';
    try {
      const result = await fetchFn();
      assert.ok(Buffer.isBuffer(result), 'result should be a Buffer');
      assert.ok(result.length > 0, 'result should be non-empty');
      assert.deepEqual(result, mockPdfBuffer);
    } finally {
      if (savedLogin !== undefined) process.env.LOGIN = savedLogin;
      else delete process.env.LOGIN;
      if (savedPassword !== undefined) process.env.PASSWORD = savedPassword;
      else delete process.env.PASSWORD;
    }
  });
});
