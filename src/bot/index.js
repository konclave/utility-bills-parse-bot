import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import {
  messageTypeText,
  messageTypeFile,
  messageTypeMediaGroup,
  format,
} from '../shared/message.js';

dotenv.config();

const token = process.env.BOT_TOKEN;
let DEBUG = false;
let bot = null;

async function callback(ctx) {
  try {
    await ctx.reply('⏳ Wait for it...');
    const { processMessage, handleError } = bindContext(ctx);
    getValues({ processMessage, handleError });
  } catch (error) {
    return handleError(error, ctx);
  }
}

export async function start() {
  if (token === undefined) {
    throw new Error('Telegram Bot token is missing!');
  }
  bot = new Telegraf(process.env['BOT_TOKEN']);
  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  bot.start((ctx) => {
    let message = `Please use the /? command to receive a bill`;
    ctx.reply(message);
  });

  bot.command('?', callback);
  bot.hears('?', callback);
  bot.hears('debug', async (ctx) => {
    DEBUG = true;
    await callback(ctx);
    DEBUG = false;
  });
}

export async function handleUpdate(message) {
  if (bot === null) {
    return;
  }
  return bot.handleUpdate(message);
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
