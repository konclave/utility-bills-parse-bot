import { callback } from './bot/callback.js';

export async function startLocalServer() {
  const http = await import('node:http');
  const server = http.createServer();
  const port = getPortFromArgs(process.argv);

  // const { promise, resolve } = Promise.withResolvers();

  server.listen(port);

  server.on('listening', () => {
    console.log(`Server is listening on port ${port}`);
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
  });

  server.on('close', () => {
    console.log('Server is closed');
    // resolve();
  });

  server.on('request', async (req, res) => {
    if (req.method === 'POST') {
      let bodyData = '';
      for await (const chunk of req) {
        bodyData += chunk.toString();
      }
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
      });
      const mockCtx = new MockTelegramBot((chunk) => {
        res.write(chunk);
        res.write('\n');
      });
      const body = JSON.parse(bodyData);
      await callback(mockCtx, { debug: true, venue: body.venue });
      res.end();
    } else {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
    }
  });

  process.on('SIGINT', () => {
    server.close();
  });

  process.on('SIGTERM', () => {
    server.close();
  });
}

export function getPortFromArgs(argv) {
  const portFlagIndex = argv.indexOf('--port');

  if (portFlagIndex !== -1) {
    return normalizePort(argv[portFlagIndex + 1]);
  }

  const inlinePortArg = argv.find((arg) => arg.startsWith('--port='));

  if (inlinePortArg) {
    return normalizePort(inlinePortArg.slice('--port='.length));
  }

  return 8000;
}

function normalizePort(value) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return 8000;
  }

  const port = Number(value);

  if (Number.isInteger(port) && port >= 1 && port <= 65535) {
    return port;
  }

  return 8000;
}

export function createMediaGroupPayload(mediaGroup) {
  return mediaGroup.map((item) => {
    if (
      item.media &&
      typeof item.media === 'object' &&
      Object.hasOwn(item.media, 'source')
    ) {
      return {
        ...item,
        media: {
          ...item.media,
          source: '***',
        },
      };
    }

    return item;
  });
}

class MockTelegramBot {
  #messages = [];
  #onMessage = () => {};

  constructor(onMessage) {
    this.#onMessage = onMessage;
  }

  reply(message) {
    this.#sendMessage(message);
  }

  replyWithDocument(document) {
    this.#sendMessage(document);
  }

  replyWithMediaGroup(mediaGroup) {
    const cleaned = createMediaGroupPayload(mediaGroup);
    this.#sendMessage(cleaned);
  }

  #sendMessage(message) {
    const json = JSON.stringify(message);
    this.#onMessage(json);
  }

  handleUpdate(update) {
    if (update.message) {
      this.#messages.push(update.message);
    }
  }
}
