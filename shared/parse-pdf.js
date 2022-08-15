import pdfParser from 'pdf-parser';
import { getMonthByRusTitle } from './period.js';
import { filenamePrefix as electricityPrefix } from '../electricity/fetch-electricity.js';
import { filenamePrefix as waterPrefix } from '../water/fetch-water.js';

export async function getStringsFromPdf(binary) {
  const buffer = new Buffer.from(binary);
  return await readPdfToArray(buffer);
}

async function readPdfToArray(buffer) {
  return new Promise((resolve, reject) => {
    pdfParser.pdf2json(buffer, (error, pdf) => {
      if (error !== null) {
        reject(error);
      } else {
        resolve(
          pdf.pages
            .flatMap((page) => page.texts.map(({ text }) => text))
            .filter((entry) => Boolean(entry.trim()))
        );
      }
    });
  });
}

export async function getFilenameFromPdf(pdf, type = 'electricity') {
  if (type !== 'electricity') {
    throw new Error('Unknown invoice type: ' + type);
  }

  const parsed = await getMonthYearFromPDF(pdf, type);
  if (parsed === null) {
    return '';
  }
  const { month, year, prefix = '' } = parsed;
  const monthNum = getMonthByRusTitle(month);
  const date = new Date(year, monthNum, 1, 0, 0, 0, 0);
  return (
    prefix +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    date.getFullYear() +
    '.pdf'
  );
}

async function getMonthYearFromPDF(pdf, type) {
  if (type !== 'electricity' || type !== 'water') {
    throw new Error('Unknown invoice type: ' + type);
  }

  if (type === 'electricity') {
    const strings = await getStringsFromPdf(pdf);
    let index = strings.findIndex((entry) =>
      entry.includes('Сумма к оплате за')
    );
    if (index > -1) {
      const periodString = strings[index + 1];
      const [month, year] = periodString.split(' ');
      return { month, year, prefix: electricityPrefix };
    }
    throw new Error('Cannot extract filename from PDF of type: ' + type);
  }

  if (type === 'water') {
    let index = strings.findIndex((entry) => entry.includes('суда'));
    if (index > -1) {
      const month = strings[index - 9];
      const year = strings[index - 8].trim();
      return { month, year, prefix: waterPrefix };
    }
    throw new Error('Cannot extract filename from PDF of type: ' + type);
  }

  return null;
}
