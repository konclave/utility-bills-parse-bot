import { getTotal } from './calculations.js';
import { getPeriodString } from './period.js';

export const messageTypeText = 'TEXT';
export const messageTypeFile = 'FILE';
export const messageTypeMediaGroup = 'MEDIA_GROUP';

const defaultFilename = 'bill.pdf';

export function format(messages, DEBUG) {
  if (!messages) {
    return [];
  }

  const mediaGroup = messages
    .filter((message) => message.fileBuffer?.length > 0)
    .map((message) => ({
      type: 'document',
      media: {
        filename: message.fileTitle || defaultFilename,
        source: message.fileBuffer,
      },
    }));

  const mediaMessages = mediaGroup.length
    ? [{ type: messageTypeMediaGroup, data: mediaGroup }]
    : [];

  const total = getTotal(messages.map((message) => message.value || 0));

  const text = [
    `Счета за период: ${getPeriodString()}`,
    ...messages.map(
      (message) =>
        message.text +
        (DEBUG && message.error ? '\n' + JSON.stringify(message.error) : '')
    ),
    `Всего: ${total}₽`,
  ].join('\n');

  const textMessages = [
    {
      type: messageTypeText,
      data: text,
    },
  ];

  return [...textMessages, ...mediaMessages];
}

export function getErrorMessage(prefix = '') {
  return prefix + ': Что-то пошло не так 💩';
}
