import { fetch as fetchWater } from './fetch-water.js';
import { parse } from './parse-water.js';
import { getErrorMessage } from '../shared/message.js';

export async function fetch() {
  try {
    const pdf = await fetchWater();
    return await parse(pdf);
  } catch(error) {
    return { text: getErrorMessage('💧', error)};
  }
}
