import {
  messageTypeText,
  messageTypeFile,
  messageTypeMediaGroup,
  format,
} from '../shared/message.js';
import { getValues } from './processing.js';

let DEBUG = false;

export async function callback(ctx, options) {
  DEBUG = options?.debug ?? false;
  try {
    await ctx.reply('⏳ Wait for it...');
    const { processMessage, handleError } = bindContext(ctx);
    await getValues({ processMessage, handleError });
  } catch (error) {
    return handleError(error, ctx);
  } finally {
    DEBUG = false;
  }
}

function sendMessage(message, ctx) {
  const { type, ...payload } = message;
  switch (type) {
    case messageTypeText:
      return ctx.reply(payload.data);
    case messageTypeFile:
      return ctx.replyWithDocument(payload.data);
    case messageTypeMediaGroup:
      return ctx.replyWithMediaGroup(payload.data);
    default:
      return ctx.reply(JSON.stringify(message));
  }
}

function bindContext(ctx) {
  return {
    processMessage: processMessage(ctx),
    handleError: handleError(ctx),
  };
}

const processMessage = (ctx) => async (message) => {
  const formatted = format([message], DEBUG);
  await Promise.all(formatted.map((message) => sendMessage(message, ctx)));
  return formatted;
};

const handleError = (ctx) => async (error) => {
  await ctx.reply('💥 Ошибка. Не удалось получить данные.');
  if (DEBUG) {
    await ctx.reply(JSON.stringify(error));
  }
};
