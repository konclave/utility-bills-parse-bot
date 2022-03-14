import * as bot from './bot/index.js';

bot.start();

export const handler = async function (event, context) {
  const message = JSON.parse(event.body);
  await bot.handleUpdate(message);
  return {
    statusCode: 200,
    body: '',
  };
};


