import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import {
  messageTypeText,
  messageTypeFile,
  messageTypeMediaGroup,
  format,
} from '../shared/message.js';

import * as water from '../water/index.js';
import * as electricity from '../electricity/index.js';
import { getTotal } from '../shared/calculations.js';

dotenv.config();

const token = process.env.BOT_TOKEN;
let DEBUG = false;
let bot = null;

function callback(ctx) {
  try {
    ctx.reply('⏳ Wait for it...');
    getValues(ctx);
  } catch (error) {
    return handleError(error, ctx);
  }
}

export function getValues(ctx) {
  Promise.all([
    (water
      .fetch()
      .then((message) => {
        return processMessage(message, ctx);
      })
      .catch((error) => {
        return handleError(error, ctx);
      }),
    electricity
      .fetch()
      .then((message) => {
        return processMessage(message, ctx);
      })
      .catch((error) => {
        return handleError(error, ctx);
      })),
  ]).then((messages) => {
    const total = getTotal(messages.map((message) => message.value || 0));
    return sendMessage(getTextMessage(`Всего: ${total}₽`), ctx);
  });
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

async function processMessage(message, ctx) {
  const formatted = format([message], DEBUG);
  await Promise.all(formatted.map((message) => sendMessage(message, ctx)));
  return formatted;
}

async function handleError(error, ctx) {
  await ctx.reply('💥 Ошибка. Не удалось получить данные.');
  if (DEBUG) {
    await ctx.reply(JSON.stringify(error));
  }
}
