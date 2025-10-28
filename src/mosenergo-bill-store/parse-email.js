export const emailMosenergo = 'mes_schet@mosenergosbyt.ru';
export const emailMosobleirc = 'epd@mosobleirc.ru';

export function handleEmailEvent(event) {
  const [entry] = event.messages;
  const message = entry.message;

  if (message.includes(emailMosobleirc)) {
    const url = getMosobleircLink(entry.message);
    return { url, type: 'MOSOBLEIRC' };
  }
  if (message.includes(emailMosenergo)) {
    const url = getMosenergoLink(entry.message);
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
  return decodeURIComponent(link);
}

function getMosobleircLink(message) {
  const link =
    message.match(
      /<a\b[^>]*\bhref\s*=\s*["']https:\/\/click.email4customers.com\/Link\?messageId=\S+&amp;linkId=\S+&amp;args=(https%3a%2f%2fepd.mosobleirc.ru%2fjReport%2fsreport-query%2[^"']*)["']/i,
    )?.[1] ?? '';
  return decodeURIComponent(link);
}
