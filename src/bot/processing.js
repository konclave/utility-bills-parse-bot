import * as water from '../water/index.js';
import * as electricity from '../electricity/index.js';
import * as mosobleirc from '../mosobleirc/index.js';
import { parse as parseWater } from '../water/parse-water.js';
import { parse as parseElectricity } from '../electricity/parse-electricity.js';
import { parseCharges } from '../mosobleirc/parse.js';
import {
  buildVenueSummary,
  normalizeProviderPayload,
} from './summary.js';

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

export async function getValues({ venue, format = 'compact' }) {
  const providers = venueProviders[venue] ?? venueProviders.DEFAULT;
  const settled = await Promise.allSettled(
    providers.map((provider) => provider.fetch()),
  );

  return buildSummaryFromSettled(settled, providers, format);
}

export async function getValuesViaProxy(proxyUrl, { venue, format = 'compact' }) {
  const providers = venueProviders[venue] ?? venueProviders.DEFAULT;
  const settled = await Promise.allSettled(
    providers.map((provider) => fetchAndParse(proxyUrl, provider.name)),
  );

  return buildSummaryFromSettled(settled, providers, format);
}

async function fetchAndParse(proxyUrl, providerName) {
  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: providerName }),
  });

  if (!res.ok) {
    throw new Error(`Proxy ${providerName} responded with ${res.status}`);
  }

  const { encoding, data } = await res.json();

  if (encoding === 'base64') {
    const buffer = Buffer.from(data, 'base64');
    if (providerName === 'water') return parseWater(buffer);
    if (providerName === 'electricity') return parseElectricity(buffer);
  }

  if (providerName === 'mosobleirc') return parseCharges(data);

  throw new Error(`Unknown provider: ${providerName}`);
}

function buildSummaryFromSettled(settled, providers, format) {
  const normalized = settled.flatMap((entry, index) => {
    const provider = providers[index];
    if (entry.status === 'fulfilled') {
      const payload = normalizeProviderPayload(
        provider.name,
        provider.venue,
        entry.value,
      );
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
