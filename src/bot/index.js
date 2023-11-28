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

dotenv.config();

const token = process.env.BOT_TOKEN;
let DEBUG = false;
let bot = null;

async function callback(ctx) {
  try {
    ctx.reply('⏳ Wait for it...');
    getValues(ctx);
  } catch (error) {
    handleError(error, ctx);
  }
}

export function getValues(ctx) {
  water
    .fetch()
    .then((message) => {
      return processMessage(message, ctx);
    })
    .catch((error) => {
      handleError(error, ctx);
    });

  electricity
    .fetch()
    .then((message) => {
      return processMessage(message, ctx);
    })
    .catch((error) => {
      handleError(error, ctx);
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

function processMessage(message, ctx) {
  const [formatted] = format([message], DEBUG);
  const { type, ...payload } = formatted;
  switch (type) {
    case messageTypeText:
      ctx.reply(payload.data);
      break;
    case messageTypeFile:
      ctx.replyWithDocument(payload.data);
      break;
    case messageTypeMediaGroup:
      ctx.replyWithMediaGroup(payload.data);
      break;
    default:
      ctx.reply(JSON.stringify(formatted));
  }
}

function handleError(error, ctx) {
  ctx.reply('💥 Ошибка. Не удалось получить данные.');
  if (DEBUG) {
    ctx.reply(JSON.stringify(error));
  }
}
