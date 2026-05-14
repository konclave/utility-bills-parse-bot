import { fetchCharges } from './fetch.js';
import { parseCharges, parsePdfToChargeData, appendPdfMessage } from './parse.js';
import { getErrorMessage } from '../shared/error-message.js';
import { getTodayISODate, getPeriodString } from '../shared/period.js';
import * as storage from './store.js';

export async function fetch() {
  const period = getPeriodString();
  let pdfBuffer;

  try {
    pdfBuffer = await storage.fetchPdf();
  } catch (error) {
    console.log(
      `MosOblEIRC persisted PDF fetch for period ${period} failed.`,
      error,
    );
  }

  if (pdfBuffer?.length) {
    try {
      const pdfData = await parsePdfToChargeData(pdfBuffer);
      const parsed = await parseCharges(pdfData);
      return appendPdfMessage({ messages: parsed, pdfBuffer, period });
    } catch (error) {
      console.log(
        `MosOblEIRC persisted PDF parse/render for period ${period} failed.`,
        error,
      );
    }
  }

  try {
    const fromStore = await storage.fetch(period);
    if (fromStore) {
      return fromStore;
    }
  } catch (error) {
    console.log(`MosOblEIRC cache read for period ${period} failed.`, error);
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
    const date = getTodayISODate();
    const json = await fetchCharges(date);
    const parsed = await parseCharges(json);
    try {
      await storage.store(period, parsed);
    } catch (error) {
      console.log(
        `MosOblEIRC cache store for period ${period} failed.`,
        error,
      );
    }
    return parsed;
  } catch (error) {
    return { text: getErrorMessage('Одинцово'), error: error.message };
  }
}
