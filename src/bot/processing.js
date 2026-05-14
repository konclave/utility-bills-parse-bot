import * as water from '../water/index.js';
import * as electricity from '../electricity/index.js';
import * as mosobleirc from '../mosobleirc/index.js';
import {
  buildVenueSummary,
  normalizeProviderPayload,
} from './summary.js';

const venueProviders = {
  O: [{ name: 'mosobleirc', fetch: mosobleirc.fetch }],
  T: [
    { name: 'water', fetch: water.fetch },
    { name: 'electricity', fetch: electricity.fetch },
  ],
  DEFAULT: [
    { name: 'water', fetch: water.fetch },
    { name: 'electricity', fetch: electricity.fetch },
    { name: 'mosobleirc', fetch: mosobleirc.fetch },
  ],
};

const venueNames = {
  O: 'Одинцово',
  T: 'Трёхгорка',
  DEFAULT: 'Все счета',
};

export async function getValues({ venue }) {
  const providers = venueProviders[venue] ?? venueProviders.DEFAULT;
  const settled = await Promise.allSettled(
    providers.map((provider) => provider.fetch()),
  );

  const normalized = settled.flatMap((entry, index) => {
    const provider = providers[index];
    if (entry.status === 'fulfilled') {
      const payload = normalizeProviderPayload(provider.name, entry.value);
      return payload.sections.map((section) => ({
        ...section,
        attachments: payload.attachments,
      }));
    }

    return [{
      provider: provider.name,
      lines: ['unavailable'],
      total: 0,
      attachments: [],
    }];
  });

  const summary = buildVenueSummary(
    venueNames[venue] ?? venueNames.DEFAULT,
    normalized,
  );

  return {
    text: summary.text,
    attachments: normalized.flatMap((section) => section.attachments || []),
  };
}
