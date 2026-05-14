import { describe, it } from 'node:test';
import { resolve } from 'node:path';
import { readFileSync } from 'fs';
import assert from 'node:assert';
import { parseCharges, extractChargeDetails } from '../parse.js';

const mosoblEircInvoiceMock = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, './mosobleirc_invoice.json'),
    'utf-8',
  ),
);

describe('mosobleirc', () => {
  describe('extractChargeDetails with JSON dump data', () => {
    it('extracts all 10 services from the invoice', () => {
      const result = extractChargeDetails(mosoblEircInvoiceMock);
      assert.strictEqual(result.length, 10);
    });

    it('extracts water service amounts', () => {
      const result = extractChargeDetails(mosoblEircInvoiceMock);
      const find = (nm) => result.find((r) => r.nm_service === nm);

      assert.strictEqual(find('ВОДООТВЕДЕНИЕ').sm_total, 514.57);
      assert.strictEqual(find('ГОРЯЧЕЕ В/С (НОСИТЕЛЬ)').sm_total, 171.54);
      assert.strictEqual(find('ГОРЯЧЕЕ В/С (ЭНЕРГИЯ)').sm_total, 681.76);
      assert.strictEqual(find('ХОЛОДНОЕ В/С').sm_total, 304.58);
    });

    it('extracts electricity service amounts', () => {
      const result = extractChargeDetails(mosoblEircInvoiceMock);
      const find = (nm) => result.find((r) => r.nm_service === nm);

      assert.strictEqual(
        find('ЭЛЕКТРИЧЕСТВО ДЕНЬ ДВУХТАРИФНЫЙ ПУ (Д1)').sm_total,
        972.32,
      );
      assert.strictEqual(
        find('ЭЛЕКТРИЧЕСТВО НОЧЬ ДВУХТАРИФНЫЙ ПУ (Д1)').sm_total,
        106.2,
      );
    });

    it('extracts domofon service amounts', () => {
      const result = extractChargeDetails(mosoblEircInvoiceMock);
      const find = (nm) => result.find((r) => r.nm_service === nm);

      assert.strictEqual(find('ЗАПИРАЮЩЕЕ УСТРОЙСТВО').sm_total, 48);
      assert.strictEqual(
        find('ОБСЛУЖИВАНИЕ СИСТЕМЫ ВИДЕОНАБЛЮДЕНИЯ').sm_total,
        83,
      );
    });

    it('extracts maintenance service amount', () => {
      const result = extractChargeDetails(mosoblEircInvoiceMock);
      const maintenance = result.find(
        (r) => r.nm_service === 'СОДЕРЖАНИЕ ЖИЛОГО ПОМЕЩЕНИЯ',
      );
      assert.strictEqual(maintenance.sm_total, 1216.94);
    });

    it('extracts heating service amount', () => {
      const result = extractChargeDetails(mosoblEircInvoiceMock);
      const heating = result.find((r) => r.nm_service === 'ОТОПЛЕНИЕ КПУ');
      assert.strictEqual(heating.sm_total, 4317.11);
    });

    it('returns empty array for empty input', () => {
      const result = extractChargeDetails([]);
      assert.deepStrictEqual(result, []);
    });

    it('returns empty array when no known services found', () => {
      const result = extractChargeDetails(['some', 'unrelated', 'strings']);
      assert.deepStrictEqual(result, []);
    });
  });

  describe('parseCharges with JSON dump data', () => {
    it('should extract correct charge data from JSON dump strings', async () => {
      const mockChargeDataFromJsonDump = {
        chargeDetails: [
          { nm_service: 'ВОДООТВЕДЕНИЕ', sm_total: '514,57' },
          { nm_service: 'ГОРЯЧЕЕ В/С (НОСИТЕЛЬ)', sm_total: '171,54' },
          { nm_service: 'ГОРЯЧЕЕ В/С (ЭНЕРГИЯ)', sm_total: '681,76' },
          { nm_service: 'ХОЛОДНОЕ В/С', sm_total: '304,58' },
          { nm_service: 'ЭЛЕКТРИЧЕСТВО ДЕНЬ ДВУХТАРИФНЫЙ ПУ (Д1)', sm_total: '972,32' },
          { nm_service: 'ЭЛЕКТРИЧЕСТВО НОЧЬ ДВУХТАРИФНЫЙ ПУ (Д1)', sm_total: '106,20' },
          { nm_service: 'ЗАПИРАЮЩЕЕ УСТРОЙСТВО', sm_total: '48,00' },
          { nm_service: 'ОБСЛУЖИВАНИЕ СИСТЕМЫ ВИДЕОНАБЛЮДЕНИЯ', sm_total: '83,00' },
          { nm_service: 'СОДЕРЖАНИЕ ЖИЛОГО ПОМЕЩЕНИЯ', sm_total: '1216,94' },
          { nm_service: 'ОТОПЛЕНИЕ КПУ', sm_total: '4317,11' },
        ],
      };

      const result = await parseCharges(mockChargeDataFromJsonDump);

      assert.strictEqual(result.length, 5);

      assert.strictEqual(result[0].emoji, '💧');
      assert.strictEqual(result[0].label, 'Вода');
      assert.strictEqual(result[0].value, 1672.45);
      assert.deepStrictEqual(result[0].breakdown, [514.57, 171.54, 681.76, 304.58]);

      assert.strictEqual(result[1].emoji, '⚡️');
      assert.strictEqual(result[1].label, 'Электричество');
      assert.strictEqual(result[1].value, 1078.52);
      assert.deepStrictEqual(result[1].breakdown, [972.32, 106.20]);

      assert.strictEqual(result[2].emoji, '📞');
      assert.strictEqual(result[2].label, 'Домофон');
      assert.strictEqual(result[2].value, 131);
      assert.deepStrictEqual(result[2].breakdown, [48, 83]);

      assert.strictEqual(result[3].emoji, '🏚️');
      assert.strictEqual(result[3].label, 'Содержание');
      assert.strictEqual(result[3].value, 1216.94);
      assert.strictEqual(result[3].breakdown, undefined);

      assert.strictEqual(result[4].emoji, '🔥');
      assert.strictEqual(result[4].label, 'Отопление');
      assert.strictEqual(result[4].value, 4317.11);
      assert.strictEqual(result[4].breakdown, undefined);
    });

    it('should verify JSON dump contains expected service data', () => {
      // Verify that the JSON dump contains the expected service names and amounts
      // This ensures our mock data is realistic and contains the right structure

      // Check for water services
      assert.ok(mosoblEircInvoiceMock.includes('ВОДООТВЕДЕНИЕ'));
      assert.ok(mosoblEircInvoiceMock.includes('ГОРЯЧЕЕ В/С (НОСИТЕЛЬ)'));
      assert.ok(mosoblEircInvoiceMock.includes('ГОРЯЧЕЕ В/С (ЭНЕРГИЯ)'));
      assert.ok(mosoblEircInvoiceMock.includes('ХОЛОДНОЕ В/С'));

      // Check for electricity services
      assert.ok(mosoblEircInvoiceMock.includes('ЭЛЕКТРИЧЕСТВО ДЕНЬ'));
      assert.ok(mosoblEircInvoiceMock.includes('ЭЛЕКТРИЧЕСТВО НОЧЬ'));

      // Check for domofon services
      assert.ok(mosoblEircInvoiceMock.includes('ЗАПИРАЮЩЕЕ УСТРОЙСТВО'));
      assert.ok(mosoblEircInvoiceMock.includes('ОБСЛУЖИВАНИЕ СИСТЕМЫ'));
      assert.ok(mosoblEircInvoiceMock.includes('ВИДЕОНАБЛЮДЕНИЯ'));

      // Check for maintenance services
      assert.ok(mosoblEircInvoiceMock.includes('СОДЕРЖАНИЕ ЖИЛОГО ПОМЕЩЕНИЯ'));

      // Check for heating services
      assert.ok(mosoblEircInvoiceMock.includes('ОТОПЛЕНИЕ КПУ'));

      // Verify private data has been cleaned up
      assert.ok(mosoblEircInvoiceMock.includes('[ИМЯ] [ФАМИЛИЯ] [ОТЧЕСТВО]'));
      assert.ok(
        mosoblEircInvoiceMock.some((item) => item.includes('УЛ [УЛИЦА]')),
      );
      assert.ok(
        mosoblEircInvoiceMock.some((item) => item.includes('д.[НОМЕР_ДОМА]')),
      );
      assert.ok(
        mosoblEircInvoiceMock.some((item) =>
          item.includes('кв.[НОМЕР_КВАРТИРЫ]'),
        ),
      );
    });
  });
});
