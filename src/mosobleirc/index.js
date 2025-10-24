import { fetchCharges } from './fetch.js';
import { parseCharges } from './parse.js';
import { getErrorMessage } from '../shared/message.js';
import { getTodayISODate } from '../shared/period.js';

export async function fetch() {
  // if the time is between 20:00 UTC and 03:00 UTC, reply with a message "Одинцово: данные доступны только в период с 03:00 до 20:00 UTC"

  const now = new Date();
  const hour = now.getUTCHours();

  if (hour >= 20 || hour < 3) {
    return {
      text: 'Одинцово: данные доступны только в период с 03:00 до 20:00 UTC',
    };
  }

  try {
    const date = getTodayISODate();
    const json = await fetchCharges(date);
    return parseCharges(json);
  } catch (error) {
    return { text: getErrorMessage('Одинцово'), error: error.message };
  }
}
