import * as bot from './src/bot/index.js';
import { webhookCallback } from './src/mosenergo-bill-store/index.js';
import { startLocalServer } from './src/dev-server.js';

if (process.env.NODE_ENV === 'development') {
  await startLocalServer();
}

export const handler = async function (event) {
  await bot.start();
  const message = JSON.parse(event.body);
  await bot.handleUpdate(message);
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
