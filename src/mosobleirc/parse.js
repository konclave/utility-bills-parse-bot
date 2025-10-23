import { getTotal } from '../shared/calculations.js';

const SERVICE_NAMES = {
  WATER: [
    'ВОДООТВЕДЕНИЕ',
    'ГОРЯЧЕЕ В/С (НОСИТЕЛЬ)',
    'ГОРЯЧЕЕ В/С (ЭНЕРГИЯ)',
    'ХОЛОДНОЕ В/С',
  ],
  ELECTRICITY: [
    'ЭЛЕКТРИЧЕСТВО ДЕНЬ ДВУХТАРИФНЫЙ ПУ (Д1)',
    'ЭЛЕКТРИЧЕСТВО НОЧЬ ДВУХТАРИФНЫЙ ПУ (Д1)',
  ],
};

function safeNumber(value) {
  if (value == null) return 0;
  const num = Number(String(value).replace(',', '.'));
  return Number.isFinite(num) ? num : 0;
}

export function parseCharges(json) {
  if (!json || !Array.isArray(json.chargeDetails)) {
    return { text: 'Одинцово: Счёта пока что нет 🙁', value: 0 };
  }
  const items = json.chargeDetails;

  const sumByNames = (names) =>
    items
      .filter((i) => names.includes(i.nm_service))
      .map((i) => safeNumber(i.sm_total))
      .reduce((a, b) => a + b, 0);

  const water = sumByNames(SERVICE_NAMES.WATER);
  const electricity = sumByNames(SERVICE_NAMES.ELECTRICITY);
  const total = getTotal([water, electricity]);

  const text = [
    '*Одинцово*',
    `💧: ${water} ₽`,
    `⚡️: ${electricity} ₽`,
    `Всего: ${total} ₽`,
  ].join('\n');

  return { text, value: total };
}
