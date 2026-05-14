function toCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function fromCents(value) {
  return value / 100;
}

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2, useGrouping: false }).format(value);
}

export function normalizeProviderPayload(provider, venue, payload) {
  const entries = Array.isArray(payload) ? payload : [payload];
  const dataEntries = entries.filter((e) => e?.emoji !== undefined);
  const attachments = entries.filter((e) => e?.fileBuffer?.length > 0);

  const hasExplicitError = entries.some((e) => e?.error);
  if (hasExplicitError) {
    return {
      sections: [
        { provider, venue, entries: [{ emoji: '⚠️', label: 'unavailable', value: null, message: 'unavailable' }], totalCents: 0 },
      ],
      attachments: [],
    };
  }

  const totalCents = dataEntries.reduce((sum, e) => sum + toCents(e.value || 0), 0);

  return {
    sections: [{ provider, venue, entries: dataEntries, totalCents }],
    attachments,
  };
}

export function buildVenueSummary(sections, format = 'compact') {
  const venueMap = new Map();
  for (const section of sections) {
    const key = section.venue || section.provider;
    if (!venueMap.has(key)) {
      venueMap.set(key, { entries: [], totalCents: 0 });
    }
    const group = venueMap.get(key);
    group.entries.push(...section.entries);
    group.totalCents += section.totalCents;
  }

  const grandTotalCents = sections.reduce((sum, s) => sum + s.totalCents, 0);
  const multiVenue = venueMap.size > 1;
  const grandTotal = fromCents(grandTotalCents);

  const text =
    format === 'detailed'
      ? renderDetailed(venueMap, grandTotal, multiVenue)
      : renderCompact(venueMap, grandTotal, multiVenue);

  return { text, total: grandTotal };
}

function renderDataEntry(entry) {
  if (entry.value === null) {
    return `${entry.emoji} ${entry.message}`;
  }
  const value = formatNumber(entry.value);
  const breakdown =
    entry.breakdown?.length > 1
      ? ` (${entry.breakdown.map(Math.round).join('+')})`
      : '';
  return `${entry.emoji} ${value} ₽${breakdown}`;
}

function renderCompact(venueMap, grandTotal, multiVenue) {
  const lines = [];
  for (const [venue, group] of venueMap) {
    lines.push(venue);
    for (const entry of group.entries) {
      lines.push(renderDataEntry(entry));
    }
    lines.push(`Итого: ${formatNumber(fromCents(group.totalCents))} ₽`);
    lines.push('');
  }
  if (multiVenue) {
    lines.push(`Итого: ${formatNumber(grandTotal)} ₽`);
  }
  return lines.join('\n').trimEnd();
}

function renderDetailed(venueMap, grandTotal, multiVenue) {
  const lines = [];
  for (const [venue, group] of venueMap) {
    lines.push(`<b>🏠 ${venue}</b>`);
    for (const entry of group.entries) {
      if (entry.value === null) {
        lines.push(`${entry.emoji} ${entry.message}`);
      } else {
        lines.push(`${entry.emoji} ${entry.label}: ${formatNumber(entry.value)} ₽`);
      }
    }
    lines.push(`<i>Итого: ${formatNumber(fromCents(group.totalCents))} ₽</i>`);
    lines.push('');
  }
  if (multiVenue) {
    lines.push(`<b>Итого: ${formatNumber(grandTotal)} ₽</b>`);
  }
  return lines.join('\n').trimEnd();
}
