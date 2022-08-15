import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import {
  messageTypeText,
  messageTypeFile,
  messageTypeMediaGroup,
  format
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
      const messages = await getValues();
      messages.forEach((message) => {
        const { type, ...payload } = message;
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
            ctx.reply(JSON.stringify(message));
        }
      });
      
    } catch (error) {
      ctx.reply('💥 Ошибка. Не удалось получить данные.');
      if (DEBUG) {
        ctx.reply(JSON.stringify(error));
      }
    }    
}

export async function getValues() {
  const waterValues = await water.fetch();
  const electricityValues = await electricity.fetch();

  return format([waterValues, electricityValues], DEBUG);
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
