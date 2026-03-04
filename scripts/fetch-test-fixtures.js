import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream, existsSync, readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root when running via `npm test` without make/dotenv
const envPath = resolve(__dirname, '..', '.env');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    if (match) {
      const [, key, value] = match;
      process.env[key] ??= value.replace(/^["']|["']$/g, '').trim();
    }
  }
}

const FIXTURES_PREFIX = process.env.YC_TEST_FIXTURES_PREFIX ?? '__fixtures__';
const FIXTURES = ['mosenergo_test.pdf', 'mosobleirc_test.pdf'];
const MOCKS_DIR = resolve(__dirname, '..', 'src', '__fixtures__');

const { YC_REGION, YC_S3_BUCKET, YC_S3_ACCESS_KEY, YC_S3_SECRET_ACCESS_KEY } =
  process.env;

const missingFixtures = FIXTURES.filter(
  (f) => !existsSync(resolve(MOCKS_DIR, f)),
);

if (missingFixtures.length === 0) {
  process.exit(0);
}

if (!YC_S3_BUCKET || !YC_S3_ACCESS_KEY || !YC_S3_SECRET_ACCESS_KEY) {
  console.warn(
    `Warning: missing S3 credentials — cannot download test fixtures: ${missingFixtures.join(
      ', ',
    )}.\n` +
      'Set YC_S3_BUCKET, YC_S3_ACCESS_KEY, YC_S3_SECRET_ACCESS_KEY in your environment or .env file.',
  );
  process.exit(0);
}

const s3 = new S3Client({
  region: YC_REGION ?? 'ru-central1',
  credentials: {
    accessKeyId: YC_S3_ACCESS_KEY,
    secretAccessKey: YC_S3_SECRET_ACCESS_KEY,
  },
  endpoint: 'https://storage.yandexcloud.net',
});

await mkdir(MOCKS_DIR, { recursive: true });

for (const filename of missingFixtures) {
  const key = `${FIXTURES_PREFIX}/${filename}`;
  const localPath = resolve(MOCKS_DIR, filename);
  process.stdout.write(`Downloading ${key} … `);
  const { Body } = await s3.send(
    new GetObjectCommand({ Bucket: YC_S3_BUCKET, Key: key }),
  );
  await pipeline(Body, createWriteStream(localPath));
  console.log('done');
}
