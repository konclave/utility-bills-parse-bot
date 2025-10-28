import pdfParser from 'pdf-parser';
import { getMonthByRusTitle } from './period.js';

export async function getStringsFromPdf(binary) {
  const buffer = Buffer.from(binary);
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
            .filter((entry) => Boolean(entry.trim())),
        );
      }
    });
  });
}

export async function getFilenameFromPdf(pdf, filenamePrefix) {
  const parsed = await getMonthYearFromPDF(pdf, filenamePrefix);
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

async function getMonthYearFromPDF(pdf, prefix) {
  const strings = await getStringsFromPdf(pdf);

  let index = strings.findIndex((entry) => entry.includes('Сумма к оплате за'));
  if (index > -1) {
    const periodString = strings[index + 1];
    const [month, year] = periodString.split(' ');
    return { month, year, prefix };
  }

  index = strings.findIndex((entry) => entry.includes('суда'));
  if (index > -1) {
    const month = strings[index - 9];
    const year = strings[index - 8].trim();
    return { month, year, prefix };
  }

  const periodString = strings.find((entry) =>
    entry.includes('ЖИЛИЩНО-КОММУНАЛЬНЫЕ И ИНЫЕ УСЛУГИ ЗА'),
  );
  if (periodString) {
    const [month, year] = periodString.trim().split(' ').slice(-3);
    return { month, year, prefix };
  }

  return null;
}
