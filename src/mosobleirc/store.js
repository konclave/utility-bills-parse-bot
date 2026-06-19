import { fetch as fetchBlob, store as storeBlob, purge as purgeBlob } from '../shared/storage.js';
import { getCurrentPeriodFilename } from '../shared/period.js';
import { filenamePrefix } from './config.js';

const CHARGES_PREFIX = 'mosobleirc-charges-';
const CHARGES_KEEP = 12;

function chargesFilename(period) {
  return `${CHARGES_PREFIX}${period}.json`;
}

export async function store(period, record) {
  const data = await record;
  await storeBlob(Buffer.from(JSON.stringify(data)), chargesFilename(period));
  purgeBlob(CHARGES_PREFIX, CHARGES_KEEP).catch(console.error);
}

export async function fetch(period) {
  const buffer = await fetchBlob(chargesFilename(period));
  if (!buffer) return undefined;
  return JSON.parse(buffer.toString());
}

export async function fetchPdf() {
  return fetchBlob(getCurrentPeriodFilename(filenamePrefix));
}
