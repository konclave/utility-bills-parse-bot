import * as https from 'https';
import axios from 'axios';
import dotenv from 'dotenv';
import { getFilenameFromPdf, getStringsFromPdf } from '../shared/parse-pdf.js';

import * as S3 from '../shared/s3.js';
import { filenamePrefix as electricityPrefix } from '../electricity/fetch-electricity.js';
import { filenamePrefix as waterPrefix } from '../water/fetch-water.js';

dotenv.config();

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const client = axios.create({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15',
  },
  timeout: process.env.REQUEST_TIMEOUT || 0,
  httpsAgent,
});

export async function webhookCallback(event) {
  const data = JSON.parse(event.body);
  const invoicelink_url = Object.values(data)[0];

  if (!invoicelink_url) {
    throw new Error(`Cannot parse Mailparser.io data: ${JSON.stringify(data)}`);
  }

  const parsedUrl = new URL(invoicelink_url);
  const invoiceUrl = parsedUrl.searchParams.get('args');
  const pdf = await downloadInvoice(invoiceUrl);

  const isTgk = await isTrehgorka(pdf);
  if (!isTgk) {
    return;
  }

  const filename = await getFilenameFromPdf(pdf, electricityPrefix);
  if (!filename) {
    return new Error(
      'Cannot get the filename from the PDF: ' + invoicelink_url,
    );
  }

  await S3.purgeStorage(filename, [waterPrefix, electricityPrefix]);
  await S3.store(pdf, filename);
}

async function isTrehgorka(pdf) {
  const strings = await getStringsFromPdf(pdf);
  return strings.some((entry) => entry.includes('КУТУЗОВСКАЯ УЛ.'));
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
