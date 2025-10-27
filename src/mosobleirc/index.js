import { fetchCharges } from './fetch.js';
import { parseCharges, parsePdfToChargeData, appendPdfMessage } from './parse.js';
import { getErrorMessage } from '../shared/message.js';
import { getTodayISODate } from '../shared/period.js';
import * as storage from './store.js';

export async function fetch() {
  const period = getPeriodString();

  try {
    const pdfBuffer = await storage.fetchPdf(period);
    const pdfData = parsePdfToChargeData(pdfBuffer);
    const parsed = parseCharges(pdfData);
    return appendPdfMessage({ messages: parsed, pdfBuffer });
  } catch (error) {
    console.log(`MosOblEIRC PDF parse for period ${data} failed.`);
  }

  // if the time is between 20:00 UTC and 03:00 UTC, reply with a message "Одинцово: данные доступны только в период с 03:00 до 20:00 UTC"
  const now = new Date();
  const hour = now.getUTCHours();

  if (hour >= 20 || hour < 3) {
    return {
      text: 'Одинцово: данные доступны только в период с 03:00 до 20:00 UTC',
    };
  }

  try {
    const fromStore = await storage.fetch(period);
    if (fromStore) {
      return fromStore;
    }
    const date = getTodayISODate();
    const json = await fetchCharges(date);
    const parsed = parseCharges(json);
    await storage.store(period, parsed);
    return parsed;
  } catch (error) {
    return { text: getErrorMessage('Одинцово'), error: error.message };
  }
}
