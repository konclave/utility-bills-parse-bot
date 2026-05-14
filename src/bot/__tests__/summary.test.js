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
      {
        provider: 'water',
        lines: ['💧: 100 ₽', '🔥: 50 ₽', '        '],
        totalCents: 15000,
      },
    ]);
    assert.equal(result.attachments.length, 1);
  });

  it('normalizes a legacy error payload into an unavailable provider section', () => {
    const result = normalizeProviderPayload('electricity', {
      text: '⚡️: Что-то пошло не так 💩',
      error: 'boom',
    });

    assert.deepEqual(result.sections, [
      { provider: 'electricity', lines: ['unavailable'], totalCents: 0 },
    ]);
  });
});

describe('buildVenueSummary', () => {
  it('renders one combined text block and computes total from normalized sections', () => {
    const result = buildVenueSummary('Трёхгорка', [
      {
        provider: 'water',
        lines: ['💧: 100 ₽', '🔥: 50 ₽', '        '],
        totalCents: 15000,
      },
      {
        provider: 'electricity',
        lines: ['unavailable'],
        totalCents: 0,
      },
    ]);

    assert.match(result.text, /Трёхгорка/);
    assert.match(result.text, /--------------/);
    assert.match(result.text, /💧: 100 ₽/);
    assert.match(result.text, /unavailable/);
    assert.match(result.text, /Total: 150 ₽/);
    assert.equal(result.total, 150);
  });

  it('rounds the displayed total to avoid floating point artifacts', () => {
    const result = buildVenueSummary('Трёхгорка', [
      {
        provider: 'water',
        lines: ['💧: 0.1 ₽'],
        totalCents: 10,
      },
      {
        provider: 'electricity',
        lines: ['⚡️: 0.2 ₽'],
        totalCents: 20,
      },
    ]);

    assert.match(result.text, /Total: 0.3 ₽/);
    assert.doesNotMatch(result.text, /0\.30000000000000004/);
    assert.equal(result.total, 0.3);
  });
});
