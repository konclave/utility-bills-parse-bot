import { fetchCharges } from './fetch.js';
import { parseCharges } from './parse.js';
import { getErrorMessage } from '../shared/message.js';
import { getTodayISODate } from '../shared/period.js';

export async function fetch() {
  try {
    const date = getTodayISODate();
    const json = await fetchCharges(date);
    return parseCharges(json);
  } catch (error) {
    console.log(JSON.stringify({ origin: 'Одинцово', error: error.message }));
    return { text: getErrorMessage('Одинцово'), error: error.message };
  }
}
