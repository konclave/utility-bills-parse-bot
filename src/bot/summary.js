export function normalizeProviderPayload(provider, payload) {
  const entries = Array.isArray(payload) ? payload : [payload];
  const textEntries = entries.filter((entry) => entry?.text !== undefined);
  const attachments = entries.filter((entry) => entry?.fileBuffer?.length > 0);

  const hasExplicitError = textEntries.some((entry) => entry?.error);
  if (hasExplicitError) {
    return {
      sections: [{ provider, lines: ['unavailable'], total: 0 }],
      attachments: [],
    };
  }

  const lines = textEntries.map((entry) => entry.text);
  const total = textEntries.reduce((sum, entry) => sum + (entry.value || 0), 0);

  return {
    sections: [{ provider, lines, total }],
    attachments,
  };
}

export function buildVenueSummary(venueName, sections) {
  const lines = [`🏠 ${venueName}`];
  const total = sections.reduce((sum, section) => sum + section.total, 0);

  for (const section of sections) {
    lines.push(`── ${section.provider}`);
    lines.push(...section.lines);
  }

  lines.push(`Total: ${total} ₽`);

  return { text: lines.join('\n'), total };
}
