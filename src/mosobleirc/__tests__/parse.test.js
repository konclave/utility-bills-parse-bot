import { describe, it } from 'node:test';
import { resolve } from 'node:path';
import { readFileSync } from 'fs';
import assert from 'node:assert';
import { parseCharges } from '../parse.js';

const mosoblEircInvoiceMock = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, './mosobleirc_invoice.json'),
    'utf-8',
  ),
);

describe('mosobleirc', () => {
  describe('parseCharges with mock data', () => {
    it('should get invoice value from mock PDF data', async () => {
      // Create mock charge data that would be extracted from the PDF
      const mockChargeData = {
        chargeDetails: [
          { nm_service: 'ВОДООТВЕДЕНИЕ', sm_total: '398,78' },
          { nm_service: 'ГОРЯЧЕЕ В/С (НОСИТЕЛЬ)', sm_total: '141,32' },
          { nm_service: 'ГОРЯЧЕЕ В/С (ЭНЕРГИЯ)', sm_total: '561,70' },
          { nm_service: 'ХОЛОДНОЕ В/С', sm_total: '227,65' },
          {
            nm_service: 'ЭЛЕКТРИЧЕСТВО ДЕНЬ ДВУХТАРИФНЫЙ ПУ (Д1)',
            sm_total: '802,26',
          },
          {
            nm_service: 'ЭЛЕКТРИЧЕСТВО НОЧЬ ДВУХТАРИФНЫЙ ПУ (Д1)',
            sm_total: '0,00',
          },
          { nm_service: 'ЗАПИРАЮЩЕЕ УСТРОЙСТВО', sm_total: '46,01' },
          {
            nm_service: 'ОБСЛУЖИВАНИЕ СИСТЕМЫ ВИДЕОНАБЛЮДЕНИЯ',
            sm_total: '79,55',
          },
          { nm_service: 'СОДЕРЖАНИЕ ЖИЛОГО ПОМЕЩЕНИЯ', sm_total: '1166,43' },
          { nm_service: 'ОТОПЛЕНИЕ КПУ', sm_total: '0,00' },
        ],
      };

      const result = await parseCharges(mockChargeData);
      assert.strictEqual(result.length, 5);
      assert.strictEqual(result[0].value, 1329.45);
      assert.strictEqual(result[1].value, 802.26);
      assert.strictEqual(result[2].value, 125.56);
      assert.strictEqual(result[3].value, 1166.43);
      assert.strictEqual(result[4].value, 0.0);

      assert.strictEqual(result[4].text, '🔥: 0.00 ₽');
    });
  });

  describe('parseCharges with JSON dump data', () => {
    it('should extract correct charge data from JSON dump strings', async () => {
      // Simulate what parsePdfToChargeData would extract from the JSON dump
      // by manually creating the charge details that would be found in the JSON strings
      const mockChargeDataFromJsonDump = {
        chargeDetails: [
          { nm_service: 'ВОДООТВЕДЕНИЕ', sm_total: '398,78' },
          { nm_service: 'ГОРЯЧЕЕ В/С (НОСИТЕЛЬ)', sm_total: '141,32' },
          { nm_service: 'ГОРЯЧЕЕ В/С (ЭНЕРГИЯ)', sm_total: '561,70' },
          { nm_service: 'ХОЛОДНОЕ В/С', sm_total: '227,65' },
          {
            nm_service: 'ЭЛЕКТРИЧЕСТВО ДЕНЬ ДВУХТАРИФНЫЙ ПУ (Д1)',
            sm_total: '802,26',
          },
          {
            nm_service: 'ЭЛЕКТРИЧЕСТВО НОЧЬ ДВУХТАРИФНЫЙ ПУ (Д1)',
            sm_total: '0,00',
          },
          { nm_service: 'ЗАПИРАЮЩЕЕ УСТРОЙСТВО', sm_total: '42,43' },
          {
            nm_service: 'ОБСЛУЖИВАНИЕ СИСТЕМЫ ВИДЕОНАБЛЮДЕНИЯ',
            sm_total: '73,36',
          },
          { nm_service: 'СОДЕРЖАНИЕ ЖИЛОГО ПОМЕЩЕНИЯ', sm_total: '1166,43' },
          { nm_service: 'ОТОПЛЕНИЕ КПУ', sm_total: '0,00' },
        ],
      };

      const result = await parseCharges(mockChargeDataFromJsonDump);

      // Verify the parsing results match expected values from the JSON dump
      assert.strictEqual(result.length, 5);
      assert.strictEqual(result[0].value, 1329.45); // Water services: 398.78 + 141.32 + 561.70 + 227.65
      assert.strictEqual(result[1].value, 802.26); // Electricity: 802.26 + 0.00
      assert.strictEqual(result[2].value, 115.79); // Domofon services: 42.43 + 73.36
      assert.strictEqual(result[3].value, 1166.43); // Maintenance: 1166.43
      assert.strictEqual(result[4].value, 0.0); // Heating: 0.00

      // Check text formatting includes intermediate values
      assert.strictEqual(
        result[0].text,
        '💧: 1329.45 ₽\n(398.78 + 141.32 + 561.7 + 227.65)',
      );
      assert.strictEqual(result[1].text, '⚡️: 802.26 ₽\n(802.26 + 0)');
      assert.strictEqual(result[2].text, '📞️: 115.79 ₽\n(42.43 + 73.36)');
      assert.strictEqual(result[3].text, '🏚️️: 1166.43 ₽');
      assert.strictEqual(result[4].text, '🔥: 0.00 ₽');
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

      // Check for expected amounts (these should be found in the JSON)
      assert.ok(mosoblEircInvoiceMock.includes('398,78'));
      assert.ok(mosoblEircInvoiceMock.includes('802,26'));
      assert.ok(mosoblEircInvoiceMock.includes('1 166,43')); // Note: has space in JSON

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
