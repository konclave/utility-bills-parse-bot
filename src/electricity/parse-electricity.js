import { getStringsFromPdf } from '../shared/parse-pdf.js';
import { filenamePrefix } from './fetch-electricity.js';

export async function parse(binary) {
  if (binary === null || binary.length === 0) {
    return { text: '⚡️: Счёта пока что нет 🙁' };
  }
  const strings = await getStringsFromPdf(binary);
  const value = parseBill(strings);

  return {
    text: `⚡️: ${value} ₽`,
    value,
    fileTitle: filenamePrefix + 'bill.pdf',
    fileBuffer: binary,
  };
}

function parseBill(strings) {
  let dayMarker = '';
  let nightMarker = '';
  let dayOffset = 0;
  let nightOffset = 0;

  if (strings.indexOf('ЕДИНЫЙ ПЛАТЕЖНЫЙ ДОКУМЕНТ') !== -1) {
    // Счёт от МосОблЕИРЦ
    dayMarker = 'ЭЛЕКТРИЧЕСТВО ДЕНЬ';
    dayOffset = 5;
    nightMarker = 'ЭЛЕКТРИЧЕСТВО НОЧЬ';
    nightOffset = 5;
  } else {
    dayMarker = ' (Т1) день';
    dayOffset = 4;
    nightMarker = ' (Т2) ночь';
    nightOffset = 4;
  }

  const idxDay = strings.indexOf(dayMarker) + dayOffset;
  const dayBill = Number(strings[idxDay].replace(',', '.'));
  const idxNight = strings.indexOf(nightMarker) + nightOffset;
  const nightBill = Number(strings[idxNight].replace(',', '.'));
  const summary = dayBill + nightBill;
  return summary;
}
