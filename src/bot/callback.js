import { getValues } from './processing.js';

export async function callback(ctx, options) {
  const debug = options?.debug ?? false;
  const format = process.env.MESSAGE_FORMAT === 'detailed' ? 'detailed' : 'compact';
  const proxyUrl = process.env.YC_PROXY_URL;

  try {
    await ctx.reply('⏳ Wait for it...');
    const summary = proxyUrl
      ? await fetchFromProxy(proxyUrl, options?.venue, format)
      : await getValues({ venue: options?.venue, format });
    await ctx.reply(summary.text, { parse_mode: 'HTML' });

    if (summary.attachments.length > 0) {
      await ctx.replyWithMediaGroup(
        summary.attachments.map((file) => ({
          type: 'document',
          media: {
            filename: file.fileTitle,
            source: file.fileBuffer,
          },
        })),
      );
    }
  } catch (error) {
    await ctx.reply('💥 Ошибка. Не удалось получить данные.');
    if (debug) {
      await ctx.reply(serializeError(error));
    }
  }
}

async function fetchFromProxy(proxyUrl, venue, format) {
  const res = await fetch(proxyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ venue, format }),
  });

  if (!res.ok) {
    throw new Error(`Proxy responded with ${res.status}`);
  }

  const data = await res.json();
  return {
    text: data.text,
    attachments: data.attachments.map((a) => ({
      fileTitle: a.fileTitle,
      fileBuffer: Buffer.from(a.fileData, 'base64'),
    })),
  };
}

function serializeError(error) {
  if (error instanceof Error) {
    return JSON.stringify({
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    });
  }

  return JSON.stringify(error);
}
