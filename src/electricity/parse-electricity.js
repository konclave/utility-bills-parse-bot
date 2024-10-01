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
  let summaryMarker = '';
  let dayOffset = 0;
  let nightOffset = 0;
  let summaryOffset = 0;

  if (strings.indexOf('ЕДИНЫЙ ПЛАТЕЖНЫЙ ДОКУМЕНТ') !== -1) {
    // Счёт от МосОблЕИРЦ
    dayMarker = 'ЭЛЕКТРИЧЕСТВО ДЕНЬ';
    dayOffset = 5;
    nightMarker = 'ЭЛЕКТРИЧЕСТВО НОЧЬ';
    nightOffset = 5;
  } else {
    dayMarker = ' (Т2) ночь Д1';
    dayOffset = -1;
    nightMarker = 'Начислено за электроэнергию в расчётном периоде: ';
    nightOffset = -1;
    summaryMarker = 'Начислено за электроэнергию в расчётном периоде: ';
    summaryOffset = 1;
  }

  const idxDay = strings.indexOf(dayMarker) + dayOffset;
  const dayBill = Number(strings[idxDay].replace(',', '.'));
  const idxNight = strings.indexOf(nightMarker) + nightOffset;
  const nightBill = Number(strings[idxNight].replace(',', '.'));
  const idxSummary = strings.indexOf(summaryMarker) + summaryOffset;
  const summary = Number(strings[idxSummary].replace(',', '.'));

  return summary;
}
