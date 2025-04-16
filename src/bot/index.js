import { Telegraf } from 'telegraf';
import { callback } from './callback.js';

const token = process.env.BOT_TOKEN;
let bot = null;

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
    await callback(ctx, { debug: true });
  });
}

export async function handleUpdate(message) {
  if (bot === null) {
    return;
  }
  return bot.handleUpdate(message);
}
