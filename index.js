import * as bot from './src/bot/index.js';
import { webhookCallback } from './src/mosenergo-bill-store/index.js';
import { startLocalServer } from './src/dev-server.js';

const botInstance = bot.init();

if (process.env.NODE_ENV === 'development') {
  await startLocalServer();
}

export const handler = async function (event) {
  const message = JSON.parse(event.body);
  botInstance.handleMessage(message);
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
