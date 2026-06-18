import { fetch as fetchWater } from './src/water/fetch-water.js';
import { fetch as fetchElectricity } from './src/electricity/fetch-electricity.js';
import { fetchCharges } from './src/mosobleirc/fetch.js';
import { getTodayISODate } from './src/shared/period.js';

const providers = {
  water: async () => {
    const pdf = await fetchWater();
    return { encoding: 'base64', data: Buffer.from(pdf).toString('base64') };
  },
  electricity: async () => {
    const pdf = await fetchElectricity();
    return { encoding: 'base64', data: Buffer.from(pdf).toString('base64') };
  },
  mosobleirc: async () => {
    const json = await fetchCharges(getTodayISODate());
    return { encoding: 'json', data: json };
  },
};

export const handler = async function (event) {
  if (!event.body) {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  const { provider } = JSON.parse(event.body);
  const fetcher = providers[provider];

  if (!fetcher) {
    return { statusCode: 400, body: JSON.stringify({ error: `Unknown provider: ${provider}` }) };
  }

  try {
    const result = await fetcher();
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
