import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeProviderPayload, buildVenueSummary } from '../summary.js';

const waterSection = {
  provider: 'water',
  venue: 'Трёхгорка',
  entries: [
    { emoji: '💧', label: 'Вода', value: 100, breakdown: [60, 40] },
    { emoji: '🔥', label: 'Отопление', value: 50 },
  ],
  totalCents: 15000,
};

const mosoblSection = {
  provider: 'mosobleirc',
  venue: 'Одинцово',
  entries: [{ emoji: '💧', label: 'Вода', value: 200 }],
  totalCents: 20000,
};

describe('normalizeProviderPayload', () => {
  it('passes structured entries through and sums total', () => {
    const result = normalizeProviderPayload('water', 'Трёхгорка', [
      { emoji: '💧', label: 'Вода', value: 100, breakdown: [60, 40] },
      { emoji: '🔥', label: 'Отопление', value: 50 },
      { fileTitle: 'water.pdf', fileBuffer: Buffer.from('1') },
    ]);

    assert.deepEqual(result.sections, [
      {
        provider: 'water',
        venue: 'Трёхгорка',
        entries: [
          { emoji: '💧', label: 'Вода', value: 100, breakdown: [60, 40] },
          { emoji: '🔥', label: 'Отопление', value: 50 },
        ],
        totalCents: 15000,
      },
    ]);
    assert.equal(result.attachments.length, 1);
  });

  it('substitutes unavailable entry when payload has error', () => {
    const result = normalizeProviderPayload('electricity', 'Трёхгорка', {
      error: 'boom',
    });

    assert.deepEqual(result.sections, [
      {
        provider: 'electricity',
        venue: 'Трёхгорка',
        entries: [{ emoji: '⚠️', label: 'unavailable', value: null, message: 'unavailable' }],
        totalCents: 0,
      },
    ]);
    assert.equal(result.attachments.length, 0);
  });
});

describe('buildVenueSummary', () => {
  describe('compact (default)', () => {
    it('groups by venue, shows per-venue Итого and grand total for multi-venue', () => {
      const result = buildVenueSummary([waterSection, mosoblSection], 'compact');

      assert.match(result.text, /Трёхгорка/);
      assert.match(result.text, /💧 100 ₽/);
      assert.match(result.text, /\(60\+40\)/);
      assert.match(result.text, /🔥 50 ₽/);
      assert.match(result.text, /Итого: 150 ₽/);
      assert.match(result.text, /Одинцово/);
      assert.match(result.text, /💧 200 ₽/);
      assert.match(result.text, /Итого: 350 ₽/);
      assert.equal(result.total, 350);
    });

    it('shows only one Итого line for single-venue', () => {
      const result = buildVenueSummary([waterSection], 'compact');

      assert.match(result.text, /Трёхгорка/);
      const itogoCount = (result.text.match(/Итого:/g) || []).length;
      assert.equal(itogoCount, 1);
      assert.equal(result.total, 150);
    });

    it('does not show breakdown when breakdown has one item', () => {
      const section = {
        provider: 'electricity',
        venue: 'Трёхгорка',
        entries: [{ emoji: '⚡️', label: 'Электричество', value: 100, breakdown: [100] }],
        totalCents: 10000,
      };
      const result = buildVenueSummary([section], 'compact');
      assert.doesNotMatch(result.text, /\(/);
    });

    it('renders null-value entries using their message field', () => {
      const section = {
        provider: 'water',
        venue: 'Трёхгорка',
        entries: [{ emoji: '💧', label: 'Вода', value: null, message: 'Счёта пока что нет 🙁' }],
        totalCents: 0,
      };
      const result = buildVenueSummary([section], 'compact');
      assert.match(result.text, /💧 Счёта пока что нет 🙁/);
    });

    it('avoids floating point artifacts in totals', () => {
      const sections = [
        { provider: 'a', venue: 'X', entries: [{ emoji: '💧', label: 'Вода', value: 0.1 }], totalCents: 10 },
        { provider: 'b', venue: 'X', entries: [{ emoji: '⚡️', label: 'Электричество', value: 0.2 }], totalCents: 20 },
      ];
      const result = buildVenueSummary(sections, 'compact');
      assert.doesNotMatch(result.text, /0\.30000000000000004/);
      assert.equal(result.total, 0.3);
    });
  });

  describe('detailed', () => {
    it('renders bold venue headers, service labels, italic per-venue totals, bold grand total', () => {
      const result = buildVenueSummary([waterSection, mosoblSection], 'detailed');

      assert.match(result.text, /<b>🏠 Трёхгорка<\/b>/);
      assert.match(result.text, /💧 Вода: 100 ₽/);
      assert.match(result.text, /🔥 Отопление: 50 ₽/);
      assert.match(result.text, /<i>Итого: 150 ₽<\/i>/);
      assert.match(result.text, /<b>🏠 Одинцово<\/b>/);
      assert.match(result.text, /💧 Вода: 200 ₽/);
      assert.match(result.text, /<b>Итого: 350 ₽<\/b>/);
      assert.equal(result.total, 350);
    });

    it('omits bold grand total for single-venue, shows only italic venue total', () => {
      const result = buildVenueSummary([waterSection], 'detailed');

      assert.match(result.text, /<i>Итого: 150 ₽<\/i>/);
      assert.doesNotMatch(result.text, /<b>Итого:/);
    });

    it('renders null-value entries using their message field', () => {
      const section = {
        provider: 'water',
        venue: 'Трёхгорка',
        entries: [{ emoji: '💧', label: 'Вода', value: null, message: 'Счёта пока что нет 🙁' }],
        totalCents: 0,
      };
      const result = buildVenueSummary([section], 'detailed');
      assert.match(result.text, /💧 Счёта пока что нет 🙁/);
    });
  });
});
