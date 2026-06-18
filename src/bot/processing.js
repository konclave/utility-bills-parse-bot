import * as water from '../water/index.js';
import * as electricity from '../electricity/index.js';
import * as mosobleirc from '../mosobleirc/index.js';
import { parse as parseWater } from '../water/parse-water.js';
import { parse as parseElectricity } from '../electricity/parse-electricity.js';
import { parsePdfToChargeData, parseCharges, appendPdfMessage } from '../mosobleirc/parse.js';
import { buildVenueSummary, normalizeProviderPayload } from './summary.js';
import { fetchByName, store } from '../shared/blob.js';
import { getCurrentPeriodFilename } from '../shared/period.js';
import { filenamePrefix as mosobleircPrefix } from '../mosobleirc/config.js';

const providerFilenamePrefix = {
  water: 'water-',
  electricity: 'electricity-',
};

const venueProviders = {
  O: [{ name: 'mosobleirc', fetch: mosobleirc.fetch, venue: 'Одинцово' }],
  T: [
    { name: 'water', fetch: water.fetch, venue: 'Трёхгорка' },
    { name: 'electricity', fetch: electricity.fetch, venue: 'Трёхгорка' },
  ],
  DEFAULT: [
    { name: 'water', fetch: water.fetch, venue: 'Трёхгорка' },
    { name: 'electricity', fetch: electricity.fetch, venue: 'Трёхгорка' },
    { name: 'mosobleirc', fetch: mosobleirc.fetch, venue: 'Одинцово' },
  ],
};

/**
 * Fetches and parses bill data for all providers in the given venue directly (no proxy).
 * @param {{venue?: string, format?: 'compact'|'detailed'}} options
 * @returns {Promise<{text: string, attachments: Array<Object>}>}
 */
export async function getValues({ venue, format = 'compact' }) {
  const providers = venueProviders[venue] ?? venueProviders.DEFAULT;
  const settled = await Promise.allSettled(
    providers.map((provider) => provider.fetch()),
  );
  return buildSummaryFromSettled(settled, providers, format);
}

/**
 * Fetches bill data via the YC proxy, using Vercel Blob as a cache to skip
 * proxy calls when a current-period PDF is already stored.
 * @param {string} proxyUrl - Full URL of the YC proxy function endpoint
 * @param {{venue?: string, format?: 'compact'|'detailed'}} options
 * @returns {Promise<{text: string, attachments: Array<Object>}>}
 */
export async function getValuesViaProxy(proxyUrl, { venue, format = 'compact' }) {
  const providers = venueProviders[venue] ?? venueProviders.DEFAULT;
  const settled = await Promise.allSettled(
    providers.map((provider) => fetchAndParse(proxyUrl, provider.name)),
  );
  return buildSummaryFromSettled(settled, providers, format);
}

/**
 * Fetches and parses data for a single provider via Blob cache or proxy.
 * On a Blob miss for water/electricity, the PDF returned by the proxy is stored
 * in Blob (fire-and-forget) so the next request is served locally.
 * @param {string} proxyUrl - Full URL of the YC proxy function endpoint
 * @param {'water'|'electricity'|'mosobleirc'} providerName
 * @returns {Promise<any>} Parsed provider charge data
 */
async function fetchAndParse(proxyUrl, providerName) {
  if (providerName === 'mosobleirc') {
    return fetchMosobleirc(proxyUrl);
  }

  const prefix = providerFilenamePrefix[providerName];
  const filename = getCurrentPeriodFilename(prefix);
  const cached = await fetchByName(filename);

  if (cached?.length) {
    if (providerName === 'water') return parseWater(cached);
    if (providerName === 'electricity') return parseElectricity(cached);
  }

  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: providerName }),
  });

  if (!res.ok) {
    throw new Error(`Proxy ${providerName} responded with ${res.status}`);
  }

  const { encoding, data } = await res.json();
  if (encoding !== 'base64') {
    throw new Error(`Expected base64 from proxy for ${providerName}`);
  }

  const buffer = Buffer.from(data, 'base64');

  store(buffer, filename).catch(console.error);

  if (providerName === 'water') return parseWater(buffer);
  if (providerName === 'electricity') return parseElectricity(buffer);

  throw new Error(`Unknown provider: ${providerName}`);
}

/**
 * Fetches and parses mosobleirc data, checking Vercel Blob for the current-period
 * PDF first. Falls back to proxy charges JSON when no PDF is cached.
 * @param {string} proxyUrl - Full URL of the YC proxy function endpoint
 * @returns {Promise<any>} Parsed mosobleirc charge data
 */
async function fetchMosobleirc(proxyUrl) {
  const filename = getCurrentPeriodFilename(mosobleircPrefix);
  const cached = await fetchByName(filename);

  if (cached?.length) {
    const pdfData = await parsePdfToChargeData(cached);
    const parsed = await parseCharges(pdfData);
    return appendPdfMessage({ messages: parsed, pdfBuffer: cached });
  }

  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'mosobleirc' }),
  });

  if (!res.ok) {
    throw new Error(`Proxy mosobleirc responded with ${res.status}`);
  }

  const { data } = await res.json();
  return parseCharges(data);
}

/**
 * Builds a formatted summary from allSettled provider results.
 * @param {Array<PromiseSettledResult<any>>} settled - Results from Promise.allSettled
 * @param {Array<{name: string, venue: string}>} providers - Provider descriptors in the same order as settled
 * @param {'compact'|'detailed'} format - Output format
 * @returns {{text: string, attachments: Array<Object>}}
 */
function buildSummaryFromSettled(settled, providers, format) {
  const normalized = settled.flatMap((entry, index) => {
    const provider = providers[index];
    if (entry.status === 'fulfilled') {
      const payload = normalizeProviderPayload(provider.name, provider.venue, entry.value);
      return payload.sections.map((section) => ({
        ...section,
        attachments: payload.attachments,
      }));
    }

    return [
      {
        provider: provider.name,
        venue: provider.venue,
        entries: [{ emoji: '⚠️', label: 'unavailable', value: null, message: 'unavailable' }],
        totalCents: 0,
        attachments: [],
      },
    ];
  });

  const summary = buildVenueSummary(normalized, format);

  return {
    text: summary.text,
    attachments: normalized.flatMap((section) => section.attachments || []),
  };
}
