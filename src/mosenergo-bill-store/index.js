import { getFilenameFromPdf, getStringsFromPdf } from '../shared/parse-pdf.js';

import * as S3 from '../shared/s3.js';
import { filenamePrefix as electricityPrefix } from '../electricity/fetch-electricity.js';
import { filenamePrefix as waterPrefix } from '../water/fetch-water.js';
import { filenamePrefix as mosobleircPrefix } from '../mosobleirc/config.js';
import { handleEmailEvent } from './parse-email.js';
import { downloadInvoice } from './fetch.js';

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

  const filenamePrefix =
    type === 'MOSOBLEIRC' ? mosobleircPrefix : electricityPrefix;

  const filename = await getFilenameFromPdf(pdf, filenamePrefix);
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
