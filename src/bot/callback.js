import {
  messageTypeText,
  messageTypeFile,
  messageTypeMediaGroup,
  format,
} from '../shared/message.js';
import { getValues } from './processing.js';

export async function callback(ctx, options) {
  const debug = options?.debug ?? false;
  const { processMessage, handleError } = bindContext(ctx, debug);

  try {
    await ctx.reply('⏳ Wait for it...');
    await getValues({ processMessage, handleError, venue: options?.venue });
  } catch (error) {
    return handleError(error);
  }
}

function sendMessage(message, ctx) {
  const { type, ...payload } = message;
  switch (type) {
    case messageTypeText:
      return ctx.reply(payload.data, { parse_mode: 'HTML' });
    case messageTypeFile:
      return ctx.replyWithDocument(payload.data);
    case messageTypeMediaGroup:
      return ctx.replyWithMediaGroup(payload.data);
    default:
      return ctx.reply(JSON.stringify(message));
  }
}

function bindContext(ctx, debug) {
  return {
    processMessage: processMessage(ctx, debug),
    handleError: handleError(ctx, debug),
  };
}

const processMessage = (ctx, debug) => async (messages) => {
  const formatted = format(
    Array.isArray(messages) ? messages : [messages],
    debug,
  );
  await Promise.all(formatted.map((message) => sendMessage(message, ctx)));
  return formatted;
};

const handleError = (ctx, debug) => async (error) => {
  await ctx.reply('💥 Ошибка. Не удалось получить данные.');
  if (debug) {
    await ctx.reply(serializeError(error));
  }
};

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
