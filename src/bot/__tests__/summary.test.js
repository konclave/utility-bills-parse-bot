import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeProviderPayload,
  buildVenueSummary,
} from '../summary.js';

describe('normalizeProviderPayload', () => {
  it('normalizes an array of legacy provider messages into summary sections and attachments', () => {
    const result = normalizeProviderPayload('water', [
      { text: '💧: 100 ₽', value: 100 },
      { text: '🔥: 50 ₽', value: 50 },
      { fileTitle: 'water.pdf', fileBuffer: Buffer.from('1') },
    ]);

    assert.deepEqual(result.sections, [
      { provider: 'water', lines: ['💧: 100 ₽', '🔥: 50 ₽'], total: 150 },
    ]);
    assert.equal(result.attachments.length, 1);
  });

  it('normalizes a legacy error payload into an unavailable provider section', () => {
    const result = normalizeProviderPayload('electricity', {
      text: '⚡️: Что-то пошло не так 💩',
      error: 'boom',
    });

    assert.deepEqual(result.sections, [
      { provider: 'electricity', lines: ['unavailable'], total: 0 },
    ]);
  });
});

describe('buildVenueSummary', () => {
  it('renders one combined text block and computes total from normalized sections', () => {
    const result = buildVenueSummary('Трёхгорка', [
      {
        provider: 'water',
        lines: ['💧: 100 ₽', '🔥: 50 ₽'],
        total: 150,
      },
      {
        provider: 'electricity',
        lines: ['unavailable'],
        total: 0,
      },
    ]);

    assert.match(result.text, /Трёхгорка/);
    assert.match(result.text, /water/i);
    assert.match(result.text, /electricity/i);
    assert.match(result.text, /Total: 150 ₽/);
    assert.equal(result.total, 150);
  });
});
