import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createMediaGroupPayload, getPortFromArgs } from '../dev-server.js';

describe('getPortFromArgs', () => {
  it('parses a separate --port value', () => {
    assert.equal(getPortFromArgs(['node', 'index.js', '--port', '3001']), 3001);
  });

  it('parses an inline --port value', () => {
    assert.equal(getPortFromArgs(['node', 'index.js', '--port=3002']), 3002);
  });

  it('falls back for malformed port values', () => {
    assert.equal(getPortFromArgs(['node', 'index.js', '--port', '3000abc']), 8000);
  });

  it('falls back for out-of-range port values', () => {
    assert.equal(getPortFromArgs(['node', 'index.js', '--port', '70000']), 8000);
  });
});

describe('createMediaGroupPayload', () => {
  it('masks source values while preserving every media-group item', () => {
    const payload = createMediaGroupPayload([
      {
        type: 'photo',
        media: { source: Buffer.from('secret'), filename: 'invoice.jpg' },
        caption: 'Invoice',
      },
      {
        type: 'document',
        media: 'file-id',
      },
    ]);

    assert.deepEqual(payload, [
      {
        type: 'photo',
        media: { source: '***', filename: 'invoice.jpg' },
        caption: 'Invoice',
      },
      {
        type: 'document',
        media: 'file-id',
      },
    ]);
  });
});
