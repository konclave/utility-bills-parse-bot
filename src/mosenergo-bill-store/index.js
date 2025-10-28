import * as https from 'node:https';
import axios from 'axios';
import { getFilenameFromPdf, getStringsFromPdf } from '../shared/parse-pdf.js';

import * as S3 from '../shared/s3.js';
import { filenamePrefix as electricityPrefix } from '../electricity/fetch-electricity.js';
import { filenamePrefix as waterPrefix } from '../water/fetch-water.js';
import { filenamePrefix as mosobleircPrefix } from '../mosobleirc/config.js';
import { handleEmailEvent } from './parse-email.js';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const client = axios.create({
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:127.0) Gecko/20100101 Firefox/127.0',
    Host: 'my.mosenergosbyt.ru',
    Accept:
      'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en,ru;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
  },
  timeout: process.env.REQUEST_TIMEOUT || 0,
  httpsAgent,
});

function handleApiGatewayEvent(event) {
  const data = JSON.parse(event.body);
  return Object.values(data)[0];
}

export async function webhookCallback(event) {
  let invoiceLinkUrl = '';
  let type = '';

  if (event.body) {
    const result = handleApiGatewayEvent(event);
    invoiceLinkUrl = result.invoiceLinkUrl;
  }

  if (event.messages) {
    const result = handleEmailEvent(event);
    invoiceLinkUrl = result.url;
    type = result.type;
  }

  if (!invoiceLinkUrl) {
    throw new Error(
      `Cannot parse email body: ${JSON.stringify(event.messages[0].message)}`,
    );
  }

  const invoiceUrl = new URL(invoiceLinkUrl);
  const pdf = await downloadInvoice(invoiceUrl);

  const isTgk = await isTrehgorka(pdf);
  if (!isTgk && type === '') {
    return;
  }

  const filename = await getFilenameFromPdf(pdf, electricityPrefix);
  if (!filename) {
    return new Error('Cannot get the filename from the PDF: ' + invoiceLinkUrl);
  }

  await S3.purgeStorage([waterPrefix, electricityPrefix, mosobleircPrefix]);
  await S3.store(pdf, filename);
}

async function isTrehgorka(pdf) {
  const strings = await getStringsFromPdf(pdf);
  return strings.some((entry) => entry.toUpperCase().includes('023221017850'));
}

async function downloadInvoice(url) {
  const options = {
    method: 'GET',
    url,
    responseType: 'arraybuffer',
    responseEncoding: 'binary',
  };

  try {
    const response = await client(options);
    return response.data;
  } catch (e) {
    throw new Error(`Failed to download invoice PDF: ${e.message}`);
  }
}
