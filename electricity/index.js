import { fetch as fetchElectricity } from './fetch-electricity.js';
import { parse } from './parse-electricity.js';
import { getErrorMessage } from '../shared/message.js';
import { fetchFromS3 } from './fetch-s3.js';

export async function fetch() {
  try {
    // const pdf = await fetchElectricity();
    const pdf = await fetchFromS3();
    return await parse(pdf);
  } catch(error) {
    return { text: getErrorMessage('⚡️'), error };
  }
}
