import { callback } from './bot/callback.js';

export async function startLocalServer() {
  const http = await import('node:http');
  const server = http.createServer();
  const port = process.argv.find((arg) => arg === '--port') ?? 8000;

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
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
      });
      const mockCtx = new MockTelegramBot((chunk) => {
        res.write(chunk);
        res.write('\n');
      });
      await callback(mockCtx, { debug: true });
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

class MockTelegramBot {
  #messages = [];
  #onMessage = () => {};

  constructor(onMessage) {
    this.#onMessage = onMessage;
  }

  reply(message) {
    console.log(message);
    this.#sendMessage(message);
  }

  replyWithDocument(document) {
    console.log(document);
    this.#sendMessage(document);
  }

  replyWithMediaGroup(mediaGroup) {
    console.log(mediaGroup);
    const cleaned = mediaGroup.map((item) => {
      if (item.media?.source) {
        item.media.source = '***';
      }
    });
    this.#sendMessage(cleaned);
  }

  #sendMessage(message) {
    const json = JSON.stringify(message);
    this.#onMessage(json);
  }
}
