import { handleEmailEvent } from './parse-email.js';

/**
 * Extracts the invoice link URL from a YC API Gateway event body.
 * @param {{body: string}} event - YC API Gateway event
 * @returns {{invoiceLinkUrl: string}}
 */
function handleApiGatewayEvent(event) {
  const data = JSON.parse(event.body);
  return Object.values(data)[0];
}

/**
 * Handles an email webhook or API Gateway event by extracting the invoice PDF URL
 * and delegating download and storage to the Vercel store-pdf endpoint.
 * @param {{body?: string, messages?: Array<Object>}} event - YC trigger event
 * @returns {Promise<void>}
 */
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
    throw new Error(`Cannot parse email body from event: ${JSON.stringify(event)}`);
  }

  const storePdfUrl = process.env.VERCEL_STORE_PDF_URL;
  if (!storePdfUrl) {
    throw new Error('VERCEL_STORE_PDF_URL is not configured');
  }

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.STORE_PDF_SECRET) {
    headers['Authorization'] = `Bearer ${process.env.STORE_PDF_SECRET}`;
  }

  const res = await fetch(storePdfUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url: invoiceLinkUrl, type }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`store-pdf endpoint failed: ${res.status} ${body}`);
  }
}
