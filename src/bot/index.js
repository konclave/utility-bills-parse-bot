import { Telegraf } from 'telegraf';
import { callback } from './callback.js';

const venueList = [
  ['Одинцово', 'O'],
  ['Трёхгорка', 'T'],
];

const token = process.env.BOT_TOKEN;

export function init() {
  if (token === undefined) {
    throw new Error('Telegram Bot token is missing!');
  }
  const bot = new Telegraf(process.env['BOT_TOKEN']);
  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  bot.start((ctx) => {
    let message = `Отправьте "?", чтобы получить счёт`;
    ctx.reply(message);
  });

  setVenueActionListeners(bot, venueList);

  bot.command('?', sendVenueSelection);
  bot.hears('?', sendVenueSelection);

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

function sendVenueSelection(ctx) {
  const venueButtons = venueList.map(([name, code]) => {
    return Markup.button.callback(name, code);
  });

  ctx.reply('Показать счёт для:', Markup.inlineKeyboard([venueButtons]));
}
