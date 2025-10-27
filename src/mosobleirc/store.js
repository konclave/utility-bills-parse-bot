import * as s3 from '../shared/s3.js';
import { getCurrentPeriodFilename } from '../shared/period.js';
import { filenamePrefix } from './config.js'

const MOSOBL_STORAGE_FILENAME = 'mosobleirc.json';

export async function store(period, record) {
  const fileBuffer = await s3.fetch(MOSOBL_STORAGE_FILENAME);
  const values = fileBuffer.length ? JSON.parse(fileBuffer.toString()) : {};
  values[period] = record;
  await s3.store(JSON.stringify(values), MOSOBL_STORAGE_FILENAME);
}

export async function fetch(period) {
  const fileBuffer = await s3.fetch(MOSOBL_STORAGE_FILENAME);
  if (!fileBuffer?.length) {
    return;
  }
  const values = JSON.parse(fileBuffer.toString());
  return values[period];
}

export async function fetchPdf() {
  const pdfFileName = getCurrentPeriodFilename(filenamePrefix);
  return await s3.fetch(pdfFileName);
}
