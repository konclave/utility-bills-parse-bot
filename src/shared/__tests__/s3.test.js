import { describe, it, mock, before, after } from 'node:test';
import assert from 'node:assert';
import { getFilenamesToKeep } from '../s3.js';

describe('S3', () => {
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

    it('should return the filenames list', (t) => {
      const result = getFilenamesToKeep(['water-', 'fire-']);
      // It keeps the files considering the number in the ”KEEP_INVOICES_NUMBER" constant
      assert.equal(result[0], 'water-09-2025.pdf');
      assert.equal(result[1], 'fire-09-2025.pdf');
      assert.equal(result[result.length - 2], 'water-10-2024.pdf');
      assert.equal(result[result.length - 1], 'fire-10-2024.pdf');
    });
  });
});
