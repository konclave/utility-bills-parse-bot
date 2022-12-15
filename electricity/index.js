import { fetch as fetchElectricity } from './fetch-electricity.js';
import { parse } from './parse-electricity.js';
import { getErrorMessage } from '../shared/message.js';

export async function fetch() {
  try {
    const pdf = await fetchElectricity();
    return await parse(pdf);
  } catch (error) {
    console.log(JSON.stringify({ origin: '⚡️', error }));
    return { text: getErrorMessage('⚡️'), error };
  }
}
