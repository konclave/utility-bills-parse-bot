import * as https from 'node:https';
import axios from 'axios';

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

export async function downloadInvoice(url) {
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
