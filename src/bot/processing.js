import * as water from '../water/index.js';
import * as electricity from '../electricity/index.js';
import * as mosobleirc from '../mosobleirc/index.js';
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
