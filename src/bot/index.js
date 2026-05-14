import { Telegraf, Markup } from 'telegraf';
import { callback } from './callback.js';
import { requiredEnv } from '../shared/config.js';

const venueList = [
  ['Одинцово', 'O'],
  ['Трёхгорка', 'T'],
];

export function init() {
  let token;
  try {
    token = requiredEnv('BOT_TOKEN');
  } catch (error) {
    console.warn(error.message);
    return null;
  }

  const bot = new Telegraf(token);
  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  bot.start((ctx) => {
    let message = `Отправьте "?", чтобы получить счёт`;
    ctx.reply(message);
  });

  setVenueActionListeners(bot, venueList);

  bot.command('?', (ctx) => sendVenueSelection(ctx, venueList));
  bot.hears('?', (ctx) => sendVenueSelection(ctx, venueList));

  bot.hears('debug', async (ctx) => {
    await callback(ctx, { debug: true });
  });

  return bot;
}

function setVenueActionListeners(bot, venueList) {
  venueList.forEach(([, code]) => {
    bot.action(code, async (ctx) => {
      await callback(ctx, { venue: code });
    });
  });
}

function sendVenueSelection(ctx, venueList) {
  const venueButtons = venueList.map(([name, code]) => {
    return Markup.button.callback(name, code);
  });

  ctx.reply('Показать счёт для:', Markup.inlineKeyboard([venueButtons]));
}
