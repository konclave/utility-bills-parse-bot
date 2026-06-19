import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FIXTURES = ['mosenergo_test.pdf', 'mosobleirc_test.pdf'];
const MOCKS_DIR = resolve(__dirname, '..', 'src', '__fixtures__');

const missingFixtures = FIXTURES.filter(
  (f) => !existsSync(resolve(MOCKS_DIR, f)),
);

if (missingFixtures.length === 0) {
  process.exit(0);
}

console.warn(
  `Warning: missing test fixtures in src/__fixtures__/: ${missingFixtures.join(', ')}.\n` +
    'Add the PDF fixture files manually to run the full test suite.',
);
process.exit(0);
