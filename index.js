import dotenv from 'dotenv';
import * as bot from './bot/index.js';
import { webhookCallback } from './mosenergo-bill-store/index.js';

dotenv.config();

if (process.env.NODE_ENV === 'development') {
  // webhookCallback({
  //   body: JSON.stringify({
  //     invoicelink_url:
  //       'https://some.url?args=http://localhost:8000/water-bill.pdf',
  //   }),
  // });
  const messages = await bot.getValues();
}

export const handler = async function (event) {
  await bot.start();
  const message = JSON.parse(event.body);
  await bot.handleUpdate(message);
  return {
    statusCode: 200,
    body: '',
  };
};

export async function storeHandler(event) {
  await webhookCallback(event);
  return {
    statusCode: 200,
    body: 'Success',
  };
}
