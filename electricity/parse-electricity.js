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
  const idxDay = strings.indexOf('ЭЛЕКТРИЧЕСТВО ДЕНЬ') + 5;
  const dayBill = Number(strings[idxDay].replace(',', '.'));
  const idxNight = strings.indexOf('ЭЛЕКТРИЧЕСТВО НОЧЬ') + 5;
  const nightBill = Number(strings[idxNight].replace(',', '.'));
  const summary = dayBill + nightBill;
  return summary;
}
