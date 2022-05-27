import { fetch as fetchElectricity } from './fetch-electricity.js';
import { parse } from './parse-electricity.js';
import { getErrorMessage } from '../shared/message.js';
import * as S3 from '../shared/s3.js';
import { getCurrentPeriodFilename } from '../shared/period.js';

export async function fetch() {
  try {
    // const pdf = await fetchElectricity();
    const filename = getCurrentPeriodFilename('electricity-');
    const pdf = await S3.fetch(filename);
    return await parse(pdf);
  } catch(error) {
    return { text: getErrorMessage('⚡️'), error };
  }
}
