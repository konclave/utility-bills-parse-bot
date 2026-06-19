import { fetch as fetchElectricity, filenamePrefix } from './fetch-electricity.js';
import { parse as parseElectricity } from './parse-electricity.js';
import { getErrorMessage } from '../shared/error-message.js';
import { fetch as fetchBlob, store } from '../shared/storage.js';
import { getCurrentPeriodFilename } from '../shared/period.js';

export async function fetch() {
  try {
    const filename = getCurrentPeriodFilename(filenamePrefix);
    const cached = await fetchBlob(filename);
    if (cached?.length) {
      return parseElectricity(cached);
    }

    const proxyUrl = process.env.YC_PROXY_URL;
    if (proxyUrl) {
      const res = await globalThis.fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'electricity' }),
      });
      if (!res.ok) throw new Error(`Proxy electricity responded with ${res.status}`);
      const { encoding, data } = await res.json();
      if (encoding !== 'base64') throw new Error('Expected base64 from proxy for electricity');
      const buffer = Buffer.from(data, 'base64');
      store(buffer, filename).catch(console.error);
      return parseElectricity(buffer);
    }

    const pdf = await fetchElectricity();
    return parseElectricity(pdf);
  } catch (error) {
    console.log(JSON.stringify({ origin: '⚡️', error: error.message }));
    return { text: getErrorMessage('⚡️'), error: error.message };
  }
}
