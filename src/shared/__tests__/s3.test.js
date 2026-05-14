import { PassThrough } from 'node:stream';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it, mock, before, after, afterEach } from 'node:test';
import { getFilenamesToKeep } from '../s3.js';

const s3ModulePath = resolve(import.meta.dirname, '../s3.js');
const s3EnvKeys = [
  'YC_REGION',
  'YC_S3_BUCKET',
  'YC_S3_ACCESS_KEY',
  'YC_S3_SECRET_ACCESS_KEY',
];
const originalEnv = Object.fromEntries(
  s3EnvKeys.map((key) => [key, process.env[key]]),
);

function createBody(text) {
  const body = new PassThrough();
  body.end(Buffer.from(text));
  return body;
}

async function importS3Module(send) {
  class GetObjectCommand {
    constructor(input) {
      this.input = input;
    }
  }

  class ListObjectsV2Command {
    constructor(input) {
      this.input = input;
    }
  }

  class DeleteObjectsCommand {
    constructor(input) {
      this.input = input;
    }
  }

  class S3Client {
    async send(command) {
      return send(command);
    }
  }

  mock.module('@aws-sdk/client-s3', {
    namedExports: {
      S3Client,
      PutObjectCommand: class PutObjectCommand {},
      ListObjectsV2Command,
      DeleteObjectsCommand,
      GetObjectCommand,
    },
  });

  return import(`${s3ModulePath}?${Math.random()}`);
}

afterEach(() => {
  mock.restoreAll();

  for (const key of s3EnvKeys) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = originalEnv[key];
  }
});

describe('S3', () => {
  describe('fetch', () => {
    it('reads the object directly without listing bucket contents first', async () => {
      process.env['YC_REGION'] = 'ru-central1';
      process.env['YC_S3_BUCKET'] = 'test-bucket';
      process.env['YC_S3_ACCESS_KEY'] = 'key';
      process.env['YC_S3_SECRET_ACCESS_KEY'] = 'secret';

      const calls = [];
      const { fetch } = await importS3Module(async (command) => {
        calls.push(command);
        return { Body: createBody('pdf data') };
      });

      const result = await fetch('invoice.pdf');

      assert.deepEqual(calls.map(({ constructor }) => constructor.name), [
        'GetObjectCommand',
      ]);
      assert.equal(calls[0].input.Bucket, 'test-bucket');
      assert.equal(calls[0].input.Key, 'invoice.pdf');
      assert.deepEqual(result, Buffer.from('pdf data'));
    });

    it('returns an empty buffer when the object is missing', async () => {
      process.env['YC_REGION'] = 'ru-central1';
      process.env['YC_S3_BUCKET'] = 'test-bucket';
      process.env['YC_S3_ACCESS_KEY'] = 'key';
      process.env['YC_S3_SECRET_ACCESS_KEY'] = 'secret';

      const { fetch } = await importS3Module(async () => {
        const error = new Error('No such key');
        error.name = 'NoSuchKey';
        throw error;
      });

      const result = await fetch('missing.pdf');

      assert.deepEqual(result, Buffer.alloc(0));
    });

    it('rethrows non-key 404 S3 errors like NoSuchBucket', async () => {
      process.env['YC_REGION'] = 'ru-central1';
      process.env['YC_S3_BUCKET'] = 'test-bucket';
      process.env['YC_S3_ACCESS_KEY'] = 'key';
      process.env['YC_S3_SECRET_ACCESS_KEY'] = 'secret';

      const { fetch } = await importS3Module(async () => {
        const error = new Error('No such bucket');
        error.name = 'NoSuchBucket';
        error.$metadata = { httpStatusCode: 404 };
        throw error;
      });

      await assert.rejects(() => fetch('missing.pdf'), {
        name: 'NoSuchBucket',
      });
    });
  });

  describe('store', () => {
    it('rethrows put failures instead of swallowing them', async () => {
      process.env['YC_REGION'] = 'ru-central1';
      process.env['YC_S3_BUCKET'] = 'test-bucket';
      process.env['YC_S3_ACCESS_KEY'] = 'key';
      process.env['YC_S3_SECRET_ACCESS_KEY'] = 'secret';

      const { store } = await importS3Module(async (command) => {
        if (command.constructor.name === 'PutObjectCommand') {
          throw new Error('put failed');
        }

        throw new Error(`Unexpected command: ${command.constructor.name}`);
      });

      await assert.rejects(() => store(Buffer.from('pdf'), 'invoice.pdf'), {
        message: 'put failed',
      });
    });
  });

  describe('purge', () => {
    it('does not send an empty delete batch when nothing matches the predicate', async () => {
      process.env['YC_REGION'] = 'ru-central1';
      process.env['YC_S3_BUCKET'] = 'test-bucket';
      process.env['YC_S3_ACCESS_KEY'] = 'key';
      process.env['YC_S3_SECRET_ACCESS_KEY'] = 'secret';

      const calls = [];
      const { purge } = await importS3Module(async (command) => {
        calls.push(command);

        if (command.constructor.name === 'ListObjectsV2Command') {
          return {
            Contents: [{ Key: 'water-01-2026.pdf' }],
          };
        }

        throw new Error(`Unexpected command: ${command.constructor.name}`);
      });

      await purge(() => false);

      assert.deepEqual(calls.map(({ constructor }) => constructor.name), [
        'ListObjectsV2Command',
      ]);
    });
  });

  describe('getFilenamesToKeep', () => {
    before(() => {
      mock.timers.enable({
        apis: ['Date'],
        now: new Date('2025-09-05T11:01:58.135Z'),
      });
    });

    after(() => {
      mock.timers.reset();
    });

    it('should return the filenames list', () => {
      const result = getFilenamesToKeep(['water-', 'fire-']);
      // It keeps the files considering the number in the ”KEEP_INVOICES_NUMBER" constant
      assert.equal(result[0], 'water-09-2025.pdf');
      assert.equal(result[1], 'fire-09-2025.pdf');
      assert.equal(result[result.length - 2], 'water-10-2024.pdf');
      assert.equal(result[result.length - 1], 'fire-10-2024.pdf');
    });
  });
});
