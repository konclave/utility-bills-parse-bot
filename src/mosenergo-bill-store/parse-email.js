export const fromMosenergosbyt = 'mes_schet@mosenergosbyt.ru';
export const fromMosobleirc = 'epd@mosobleirc.ru';

export function handleEmailEvent(event) {
  const [entry] = event.messages;
  const from = entry.headers.find(entry => entry.name === 'From');
  const fromEmail = from.values[0].match(/.+\<(.+)\>/)?.[1];

  switch (fromEmail) {
    case fromMosobleirc: {
      const url = getMosobleircLink(entry.message);
      return { url, type: 'MOSOBLEIRC' };
    }
    case fromMosenergosbyt: {
      const url = getMosenergoLink(entry.message);
      return { url, type: 'MOSENERGO' };
    }
    default:
      throw new Error(`Unknown email sender "${from}"`);
  }
}

function getMosenergoLink(message) {
    const link = message.match(
    /<a\b[^>]*\bhref\s*=\s*["'](https:\/\/my.mosenergosbyt.ru\/printServ\?[^"']*)["']/i,
  )?.[1] ?? '';
  return decodeURIComponent(link);
}

function getMosobleircLink(message) {
  const link = message.match(/<a\b[^>]*\bhref\s*=\s*["']https:\/\/click.email4customers.com\/Link\?messageId=\S+&amp;linkId=\S+&amp;args=(https%3a%2f%2fepd.mosobleirc.ru%2fjReport%2fsreport-query%2[^"']*)["']/i,)?.[1] ?? '';
  return decodeURIComponent(link)
}
