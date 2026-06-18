import * as bot from '../src/bot/index.js';

const botInstance = bot.init();

/**
 * Vercel webhook handler — receives Telegram updates and forwards them to the bot instance.
 * @param {import('http').IncomingMessage & {body: object}} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  if (!botInstance) {
    return res.status(500).json({ error: 'Bot not initialized' });
  }

  if (req.method !== 'POST') {
    return res.status(200).send('OK');
  }

  try {
    await botInstance.handleUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).json({ ok: false });
  }
}
