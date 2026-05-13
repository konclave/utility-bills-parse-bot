import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getFilenameFromPdf } from '../parse-pdf.js';

describe('getFilenameFromPdf', () => {
  const pdfBuffer = readFileSync(
    `${import.meta.dirname}/../../__fixtures__/mosobleirc_test.pdf`,
  );
  it('should return the proper file name for Mosobleirc PDF', async () => {
    const result = await getFilenameFromPdf(pdfBuffer, 'mosobleirc-');
    assert.strictEqual(result, 'mosobleirc-01-2026.pdf');
  });
});
