import { message } from 'telegraf/filters';

export const messageTypeText = 'TEXT';
export const messageTypeFile = 'FILE';
export const messageTypeMediaGroup = 'MEDIA_GROUP';

const defaultFilename = 'bill.pdf';

export function format(messages, DEBUG) {
  if (!messages) {
    return [];
  }

  const values = messages.map((message) => message.value || 0);

  const mediaGroup = messages
    .filter((message) => message.fileBuffer?.length > 0)
    .map((message) => ({
      type: 'document',
      media: {
        filename: message.fileTitle || defaultFilename,
        source: message.fileBuffer,
      },
      value: message.value,
    }));

  const mediaMessages = mediaGroup.length
    ? [{ type: messageTypeMediaGroup, data: mediaGroup }]
    : [];

  const text = [
    ...messages.map(
      (message) =>
        message.text +
        (DEBUG && message.error ? '\n' + JSON.stringify(message.error) : ''),
    ),
  ].join('\n');

  const textMessage = {
    type: messageTypeText,
    data: text,
    values,
  };

  return [textMessage, ...mediaMessages];
}

export function getErrorMessage(prefix = '') {
  return prefix + ': Что-то пошло не так 💩';
}
