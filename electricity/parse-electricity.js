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
  const idx = strings.indexOf(
    'Начислено за электроэнергию в расчётном периоде: '
  );
  return Number(strings[idx + 1].replace(',', '.'));
}
