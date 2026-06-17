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

  bot.start(async (ctx) => {
    await ctx.reply(`Отправьте "?", чтобы получить счёт`);
  });

  setVenueActionListeners(bot, venueList);

  bot.command('?', (ctx) => sendVenueSelection(ctx, venueList));
  bot.hears('?', async (ctx) => sendVenueSelection(ctx, venueList));

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

async function sendVenueSelection(ctx, venueList) {
  const venueButtons = venueList.map(([name, code]) => {
    return Markup.button.callback(name, code);
  });

  await ctx.reply('Показать счёт для:', Markup.inlineKeyboard([venueButtons]));
}
