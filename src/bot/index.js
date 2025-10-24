import { Telegraf } from 'telegraf';
import { callback } from './callback.js';

const venueList = [
  ['Одинцово', 'O'],
  ['Трёхгорка', 'T'],
];

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
    let message = `Отправьте "?", чтобы получить счёт`;
    ctx.reply(message);
  });

  setVenueActionListeners({ bot, venueList });

  bot.command('?', sendVenueSelection);
  bot.hears('?', sendVenueSelection);

  bot.hears('debug', async (ctx) => {
    await callback(ctx, { debug: true });
  });
}

function setVenueActionListeners({ bot, venueList }) {
  venueList.forEach(([name, code]) => {
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

export async function handleUpdate(message) {
  if (bot === null) {
    return;
  }
  return bot.handleUpdate(message);
}
