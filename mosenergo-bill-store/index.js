import axios from 'axios';
import dotenv from 'dotenv';
import { getStringsFromPdf } from '../shared/parse-pdf.js';
import { getPeriodString, getMonthByRusTitle } from "../shared/period.js";
import * as S3 from '../shared/s3.js';
import { filenamePrefix as electricityPrefix } from '../electricity/fetch-electricity.js';
import { filenamePrefix as waterPrefix } from '../water/fetch-water.js';

dotenv.config();

const KEEP_INVOICES_NUMBER = 3;

const client = axios.create({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
  },
  timeout: process.env.REQUEST_TIMEOUT || 0,
});

export async function webhookCallback(event) {
  const data = JSON.parse(event.body);
  const { invoicelink_url } = data;
  const parsedUrl = new URL(invoicelink_url)
  const invoiceUrl = parsedUrl.searchParams.get('args');
  const pdf = await downloadInvoice(invoiceUrl);
  const filename = await getFilename(pdf);
  if (!filename) {
    return new Error('Cannot get the filename from the PDF: ' + invoicelink_url);
  }
  await purgeStorage(filename);
  await S3.store(pdf, filename);
}

async function downloadInvoice(url) {
  const options = {
    method: 'GET',
    url,
    responseType: 'arraybuffer',
    responseEncoding: 'binary',
  };

  const response = await client(options);
  return response.data;
}

async function purgeStorage(filename) {
  const keep = getFilenamesToKeep(filename);
  const predicate = (object) => !keep.includes(object);
  S3.purge(predicate);
}

async function getFilename(pdf) {
  const parsed = await getMonthYearFromPDF(pdf);
  if (parsed === null) {
    return '';
  }
  const { month, year, prefix = '' } = parsed;
  const monthNum = getMonthByRusTitle(month);
  const date = new Date(year, monthNum, 1, 0, 0, 0, 0);
  return prefix + String(date.getMonth() + 1).padStart(2, '0') + '-' + date.getFullYear() + '.pdf';
}

async function getMonthYearFromPDF(pdf) {
  const strings = await getStringsFromPdf(pdf);
  let index = strings.findIndex((entry) => entry.includes('Сумма к оплате за'));
  if (index > -1) {
    const periodString = strings[index + 1];
    const [month, year] = periodString.split(' ');
    return { month, year, prefix: electricityPrefix };
  }

  index = strings.findIndex((entry) => entry.includes('суда'));
  if (index > -1) {
    const month = strings[index - 9];
    const year = strings[index - 8].trim();
    return { month, year, prefix: waterPrefix };
  }

  return null;
}

function getFilenamesToKeep(filename) {
  const prefixes = [waterPrefix, electricityPrefix];

  const chunks = filename.split('.')[0].split('-');
  const year = Number(chunks[chunks.length - 1]);
  const month = Number(chunks[chunks.length - 2]);

  const keep = [];

  for (let i = 0; i < KEEP_INVOICES_NUMBER; i++) {
    let prevMonth = month - i;
    let prevYear = year;
    if (prevMonth < 1) {
      prevMonth += 12;
      prevYear -= 1;
    }

    for (let prefix of prefixes) {
      keep.push(`${prefix}${String(prevMonth).padStart(2, '0')}-${prevYear}.pdf`);
    }
  }

  return keep;
}
