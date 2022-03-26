import dotenv from 'dotenv';
import * as bot from './bot/index.js';
import { webhookCallbak } from './mosenergo-bill-store/index.js';

dotenv.config();

if (process.env.NODE_ENV === 'development') {
  bot.getValues();
} else {
  bot.start();
}

export const handler = async function (event) {
  const message = JSON.parse(event.body);
  await bot.handleUpdate(message);
  return {
    statusCode: 200,
    body: '',
  };
};

export async function storeHandler(event) {
  await webhookCallbak(event);
  return {
    statusCode: 200,
    body: 'Success',
  };
}
