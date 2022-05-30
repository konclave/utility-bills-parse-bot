import { fetch as fetchElectricity, filenamePrefix } from './fetch-electricity.js';
import { parse } from './parse-electricity.js';
import { getErrorMessage } from '../shared/message.js';

export async function fetch() {
  try {
    const pdf = await fetchElectricity();
    return await parse(pdf);
  } catch(error) {
    return { text: getErrorMessage('⚡️'), error };
  }
}

export filenamePrefix;
