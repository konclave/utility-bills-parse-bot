import { getValues } from './processing.js';

export async function callback(ctx, options) {
  const debug = options?.debug ?? false;

  try {
    await ctx.reply('⏳ Wait for it...');
    const summary = await getValues({ venue: options?.venue });
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
