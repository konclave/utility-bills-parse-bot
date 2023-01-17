import axios from 'axios';
import dotenv from 'dotenv';
import { getFilenameFromPdf } from '../shared/parse-pdf.js';

import * as S3 from '../shared/s3.js';
import { filenamePrefix as electricityPrefix } from '../electricity/fetch-electricity.js';
import { filenamePrefix as waterPrefix } from '../water/fetch-water.js';

dotenv.config();

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
  const parsedUrl = new URL(invoicelink_url);
  const invoiceUrl = parsedUrl.searchParams.get('args');
  const pdf = await downloadInvoice(invoiceUrl);

  const filename = await getFilenameFromPdf(pdf, electricityPrefix);
  if (!filename) {
    return new Error(
      'Cannot get the filename from the PDF: ' + invoicelink_url
    );
  }

  await S3.purgeStorage(filename, [waterPrefix, electricityPrefix]);
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
