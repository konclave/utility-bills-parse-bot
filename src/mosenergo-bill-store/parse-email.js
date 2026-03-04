import * as cheerio from 'cheerio';

export const emailMosenergo = 'mes_schet@mosenergosbyt.ru';
export const emailMosobleirc = 'epd@mosobleirc.ru';

function normalizeMessage(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') return parsed;
  } catch {
    // not JSON-encoded, use as-is
  }
  return raw;
}

export function handleEmailEvent(event) {
  const [entry] = event.messages;
  const message = normalizeMessage(entry.message);
  const from = entry.headers.find((header) => header.name === 'From')
    ?.values[0];

  if (message.includes(emailMosobleirc) || from.includes(emailMosobleirc)) {
    const url = getMosobleircLink(message);
    return { url, type: 'MOSOBLEIRC' };
  }

  if (message.includes(emailMosenergo) || from.includes(emailMosenergo)) {
    const url = getMosenergoLink(message);
    return { url, type: 'MOSENERGO' };
  }

  throw new Error(
    `Unknown email sender "${message
      .match(/-------- Пересылаемое сообщение --------(.+)Кому:/g)?.[1]
      ?.replaceAll(/<\/?div>/, '')}"`,
  );
}

function getMosenergoLink(message) {
  const link =
    message.match(
      /<a\b[^>]*\bhref\s*=\s*["'](https:\/\/my.mosenergosbyt.ru\/printServ\?[^"']*)["']/i,
    )?.[1] ?? '';
  return decodeLink(link);
}

function getMosobleircLink(message) {
  const $ = cheerio.load(message);
  let result = '';
  $('a').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (!href.includes('click.email4customers.com/Link')) return;
    try {
      const args = new URL(href).searchParams.get('args') ?? '';
      if (args.startsWith('https://epd.mosobleirc.ru/jReport')) {
        result = args;
        return false;
      }
    } catch {
      // skip invalid URLs
    }
  });
  return result;
}

function decodeLink(link) {
  return decodeURIComponent(link.replaceAll('&amp;', '&'));
}
