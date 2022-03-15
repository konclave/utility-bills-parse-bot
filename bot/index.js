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
if (token === undefined) {
  throw new Error('Telegram Bot token is missing!');
}

let DEBUG = false;

const bot = new Telegraf(process.env.BOT_TOKEN);
  // Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

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

async function getValues() {
  const messages = [];
  
  const waterValues = await water.fetch();
  const electricityValues = await electricity.fetch();

  const formatted = format([waterValues, electricityValues], DEBUG);
  
  return messages.concat(formatted);
}

export async function start() {
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
  return bot.handleUpdate(message);
}
