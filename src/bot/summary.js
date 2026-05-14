function toCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function fromCents(value) {
  return value / 100;
}

export function normalizeProviderPayload(provider, payload) {
  const entries = Array.isArray(payload) ? payload : [payload];
  const textEntries = entries.filter((entry) => entry?.text !== undefined);
  const attachments = entries.filter((entry) => entry?.fileBuffer?.length > 0);

  const hasExplicitError = textEntries.some((entry) => entry?.error);
  if (hasExplicitError) {
    return {
      sections: [{ provider, lines: ['unavailable'], totalCents: 0 }],
      attachments: [],
    };
  }

  const lines = textEntries.map((entry) => entry.text);
  const totalCents = textEntries.reduce(
    (sum, entry) => sum + toCents(entry.value),
    0,
  );

  lines.push('        '); // separator between sections

  return {
    sections: [{ provider, lines, totalCents }],
    attachments,
  };
}

export function buildVenueSummary(venueName, sections) {
  const lines = [`🏠 ${venueName}`, '--------------'];
  const totalCents = sections.reduce(
    (sum, section) => sum + (section.totalCents || 0),
    0,
  );
  const total = fromCents(totalCents);

  for (const section of sections) {
    lines.push(...section.lines);
  }

  lines.push(`Total: ${total} ₽`);

  return { text: lines.join('\n'), total };
}
