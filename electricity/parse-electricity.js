import { getStringsFromPdf } from '../shared/parse-pdf.js';

export async function parse(binary) {
  if (binary.length === 0) {
    return { text: '⚡️: Счёта пока что нет 🙁' };
  }
  const strings = await getStringsFromPdf(binary);
  const value = parseBill(strings);

  return {
    text: `⚡️: ${value} ₽`,
    value,
    fileTitle: 'electricity-bill.pdf',
    fileBuffer: binary,
  };
}

function parseBill(strings) {
  const idx = strings.indexOf(
    'Начислено за электроэнергию в расчётном периоде: '
  );
  return Number(strings[idx + 1].replace(',', '.'));
}
