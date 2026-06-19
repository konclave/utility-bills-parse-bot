import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetch } from '../src/shared/storage.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORAGE_PATH = '__fixtures__';

const FIXTURES = ['mosenergo_test.pdf', 'mosobleirc_test.pdf'];
const MOCKS_DIR = resolve(__dirname, '..', 'src', '__fixtures__');

const missingFixtures = FIXTURES.filter(
  (f) => !existsSync(resolve(MOCKS_DIR, f)),
);

if (missingFixtures.length === 0) {
  process.exit(0);
}

mkdirSync(MOCKS_DIR, { recursive: true });

await Promise.all(
  missingFixtures.map(async (fileName) => {
    const file = await fetch(`${STORAGE_PATH}/${fileName}`);
    const fullPath = resolve(MOCKS_DIR, fileName);
    writeFileSync(fullPath, file);
  }),
);

process.exit(0);
