import { getValues } from './src/bot/processing.js';

export const handler = async function (event) {
  if (!event.body) {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  const { venue, format } = JSON.parse(event.body);

  try {
    const result = await getValues({ venue, format });
    return {
      statusCode: 200,
      body: JSON.stringify({
        text: result.text,
        attachments: result.attachments.map((a) => ({
          fileTitle: a.fileTitle,
          fileData: Buffer.from(a.fileBuffer).toString('base64'),
        })),
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
