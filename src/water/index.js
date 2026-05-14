import { fetch as fetchWater } from './fetch-water.js';
import { parse } from './parse-water.js';
import { getErrorMessage } from '../shared/error-message.js';

export async function fetch() {
  try {
    const pdf = await fetchWater();
    return await parse(pdf);
  } catch (error) {
    console.log(JSON.stringify({ origin: '💧', error: error.message }));
    return { text: getErrorMessage('💧'), error: error.message };
  }
}
