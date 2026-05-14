import * as bot from './src/bot/index.js';
import { webhookCallback } from './src/mosenergo-bill-store/index.js';
import { startLocalServer } from './src/dev-server.js';

const botInstance = bot.init();

if (process.env.NODE_ENV === 'development') {
  await startLocalServer();
}

export const handler = async function (event) {
  if (!botInstance) {
    throw new Error('Telegram bot is not initialized. Set BOT_TOKEN before handling updates.');
  }

  const message = JSON.parse(event.body);
  await botInstance.handleUpdate(message);
  return {
    statusCode: 200,
    body: 'Success',
  };
};

export const storeHandler = async (event) => {
  await webhookCallback(event);
  return {
    statusCode: 200,
    body: 'Success',
  };
};
