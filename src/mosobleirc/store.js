import * as s3 from '../shared/s3.js';
import { getCurrentPeriodFilename } from '../shared/period.js';
import { filenamePrefix } from './config.js';
import { fetchByName } from '../shared/blob.js';

const MOSOBL_STORAGE_FILENAME = 'mosobleirc.json';

/**
 * Persists parsed charge records for a billing period in YC S3.
 * @param {string} period - Billing period string, e.g. '05-2026'
 * @param {Promise<any>|any} record - Parsed charge data (awaited before storing)
 * @returns {Promise<void>}
 */
export async function store(period, record) {
  const fileBuffer = await s3.fetch(MOSOBL_STORAGE_FILENAME);
  const values = fileBuffer.length ? JSON.parse(fileBuffer.toString()) : {};
  values[period] = await record;
  await s3.store(JSON.stringify(values), MOSOBL_STORAGE_FILENAME);
}

/**
 * Retrieves cached charge records for a billing period from YC S3.
 * @param {string} period - Billing period string, e.g. '05-2026'
 * @returns {Promise<any|undefined>} Cached records, or undefined if not found
 */
export async function fetch(period) {
  const fileBuffer = await s3.fetch(MOSOBL_STORAGE_FILENAME);
  if (!fileBuffer?.length) {
    return;
  }
  const values = JSON.parse(fileBuffer.toString());
  return values[period];
}

/**
 * Fetches the current-period mosobleirc PDF from Vercel Blob.
 * @returns {Promise<Buffer|null>} PDF buffer, or null if not yet stored in Blob
 */
export async function fetchPdf() {
  const pdfFileName = getCurrentPeriodFilename(filenamePrefix);
  return await fetchByName(pdfFileName);
}
