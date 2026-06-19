# Provider Fetch Strategy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move proxy/cache routing logic from `processing.js` into each provider's `index.js`, so the bot layer calls one function per provider and providers decide their own fetch strategy.

**Architecture:** Each provider's `index.js` implements a self-contained fetch strategy (blob cache → proxy → direct). `processing.js` becomes a thin orchestrator with a single `getValues()` export. `callback.js` loses the `YC_PROXY_URL` branch entirely.

**Tech Stack:** Node.js (ESM), `node:test` + `node:assert/strict`, `@vercel/blob` via `src/shared/storage.js`, `globalThis.fetch` for proxy HTTP calls.

## Global Constraints

- All test files use `node:test` + `node:assert/strict` — no third-party test libraries.
- Module mocks use `mock.module(resolvedAbsolutePath, { namedExports: { ... } })` — always resolve paths with `resolve(import.meta.dirname, ...)`.
- Each test file imports its subject module with a unique query suffix (`?suffix`) to get a fresh instance per test.
- `store()` calls in providers are fire-and-forget (`.catch(console.error)`); tests that assert on store calls must `await waitForTurn()` after invoking `fetch()`.
- Proxy HTTP calls use `globalThis.fetch` — mock with `mock.method(globalThis, 'fetch', ...)`.
- `process.env.YC_PROXY_URL` must be deleted in `afterEach` for any test that sets it.
- Run tests with: `node --test --experimental-test-module-mocks`

---

### Task 1: water/index.js — absorb fetch strategy

**Files:**
- Modify: `src/water/index.js`
- Create: `src/water/__tests__/index.test.js`

**Interfaces:**
- Consumes: `storage.fetch(filename): Promise<Buffer|null>`, `storage.store(buffer, filename): Promise<void>`, `fetchWater(): Promise<Buffer>`, `parseWater(buffer): Promise<any[]>`, `getCurrentPeriodFilename(prefix): string`, `process.env.YC_PROXY_URL`
- Produces: `fetch(): Promise<any[]|{text:string,error:string}>` — same signature as before, now handles all three paths internally

- [ ] **Step 1: Write the failing tests**

Create `src/water/__tests__/index.test.js`:

```js
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { setImmediate as waitForTurn } from 'node:timers/promises';

const indexPath = resolve(import.meta.dirname, '../index.js');
const storagePath = resolve(import.meta.dirname, '../../shared/storage.js');
const fetchWaterPath = resolve(import.meta.dirname, '../fetch-water.js');
const parsePath = resolve(import.meta.dirname, '../parse-water.js');
const periodPath = resolve(import.meta.dirname, '../../shared/period.js');

async function importWaterIndex({
  blobResult = null,
  storeResult = async () => {},
  directFetch = async () => Buffer.from('direct pdf'),
  parse = async () => [{ label: 'Вода', value: 100 }],
  getCurrentPeriodFilename = () => 'water-05-2026.pdf',
} = {}, suffix) {
  mock.module(storagePath, {
    namedExports: {
      fetch: async () => blobResult,
      store: storeResult,
      purge: async () => {},
    },
  });
  mock.module(fetchWaterPath, {
    namedExports: { fetch: directFetch, filenamePrefix: 'water-' },
  });
  mock.module(parsePath, {
    namedExports: { parse },
  });
  mock.module(periodPath, {
    namedExports: { getCurrentPeriodFilename },
  });
  return import(`${indexPath}?${suffix}`);
}

afterEach(() => {
  mock.restoreAll();
  delete process.env.YC_PROXY_URL;
});

describe('water index fetch', () => {
  it('returns parsed blob result without calling proxy or direct fetch', async () => {
    const directCalls = [];
    const proxyCalls = [];
    const { fetch } = await importWaterIndex({
      blobResult: Buffer.from('cached pdf'),
      directFetch: async () => { directCalls.push(1); return Buffer.from('x'); },
    }, 'water-blob-hit');
    mock.method(globalThis, 'fetch', async (...args) => { proxyCalls.push(args); });

    const result = await fetch();

    assert.strictEqual(directCalls.length, 0);
    assert.strictEqual(proxyCalls.length, 0);
    assert.ok(Array.isArray(result));
  });

  it('fetches from proxy, stores buffer fire-and-forget, returns parsed result on blob miss', async () => {
    const stored = [];
    const fakePdf = Buffer.from('%PDF proxy-water');
    process.env.YC_PROXY_URL = 'https://proxy.yc/bills';
    const { fetch } = await importWaterIndex({
      blobResult: null,
      storeResult: async (buf, filename) => { stored.push({ filename }); },
    }, 'water-proxy-path');
    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      json: async () => ({ encoding: 'base64', data: fakePdf.toString('base64') }),
    }));

    const result = await fetch();
    await waitForTurn();

    assert.strictEqual(stored.length, 1);
    assert.match(stored[0].filename, /^water-/);
    assert.ok(Array.isArray(result));
  });

  it('calls direct fetchWater when blob miss and no YC_PROXY_URL', async () => {
    const directCalls = [];
    const { fetch } = await importWaterIndex({
      blobResult: null,
      directFetch: async () => { directCalls.push(1); return Buffer.from('direct pdf'); },
    }, 'water-direct-path');

    const result = await fetch();

    assert.strictEqual(directCalls.length, 1);
    assert.ok(Array.isArray(result));
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```
node --test --experimental-test-module-mocks src/water/__tests__/index.test.js
```

Expected: all three tests fail (module not found or wrong shape).

- [ ] **Step 3: Implement the new `src/water/index.js`**

```js
import { fetch as fetchWater, filenamePrefix } from './fetch-water.js';
import { parse as parseWater } from './parse-water.js';
import { getErrorMessage } from '../shared/error-message.js';
import { fetch as fetchBlob, store } from '../shared/storage.js';
import { getCurrentPeriodFilename } from '../shared/period.js';

export async function fetch() {
  try {
    const filename = getCurrentPeriodFilename(filenamePrefix);
    const cached = await fetchBlob(filename);
    if (cached?.length) {
      return parseWater(cached);
    }

    const proxyUrl = process.env.YC_PROXY_URL;
    if (proxyUrl) {
      const res = await globalThis.fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'water' }),
      });
      if (!res.ok) throw new Error(`Proxy water responded with ${res.status}`);
      const { encoding, data } = await res.json();
      if (encoding !== 'base64') throw new Error('Expected base64 from proxy for water');
      const buffer = Buffer.from(data, 'base64');
      store(buffer, filename).catch(console.error);
      return parseWater(buffer);
    }

    const pdf = await fetchWater();
    return parseWater(pdf);
  } catch (error) {
    console.log(JSON.stringify({ origin: '💧', error: error.message }));
    return { text: getErrorMessage('💧'), error: error.message };
  }
}
```

- [ ] **Step 4: Run tests — verify all three pass**

```
node --test --experimental-test-module-mocks src/water/__tests__/index.test.js
```

Expected: all 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/water/index.js src/water/__tests__/index.test.js
git commit -m "feat: water provider owns blob/proxy/direct fetch strategy"
```

---

### Task 2: electricity/index.js — absorb fetch strategy

**Files:**
- Modify: `src/electricity/index.js`
- Create: `src/electricity/__tests__/index.test.js`

**Interfaces:**
- Consumes: same pattern as Task 1 but for electricity
- Produces: `fetch(): Promise<any[]|{text:string,error:string}>`

- [ ] **Step 1: Write the failing tests**

Create `src/electricity/__tests__/index.test.js`:

```js
import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { setImmediate as waitForTurn } from 'node:timers/promises';

const indexPath = resolve(import.meta.dirname, '../index.js');
const storagePath = resolve(import.meta.dirname, '../../shared/storage.js');
const fetchElectricityPath = resolve(import.meta.dirname, '../fetch-electricity.js');
const parsePath = resolve(import.meta.dirname, '../parse-electricity.js');
const periodPath = resolve(import.meta.dirname, '../../shared/period.js');

async function importElectricityIndex({
  blobResult = null,
  storeResult = async () => {},
  directFetch = async () => Buffer.from('direct pdf'),
  parse = async () => [{ label: 'Электричество', value: 200 }],
  getCurrentPeriodFilename = () => 'electricity-05-2026.pdf',
} = {}, suffix) {
  mock.module(storagePath, {
    namedExports: {
      fetch: async () => blobResult,
      store: storeResult,
      purge: async () => {},
    },
  });
  mock.module(fetchElectricityPath, {
    namedExports: { fetch: directFetch, filenamePrefix: 'electricity-' },
  });
  mock.module(parsePath, {
    namedExports: { parse },
  });
  mock.module(periodPath, {
    namedExports: { getCurrentPeriodFilename },
  });
  return import(`${indexPath}?${suffix}`);
}

afterEach(() => {
  mock.restoreAll();
  delete process.env.YC_PROXY_URL;
});

describe('electricity index fetch', () => {
  it('returns parsed blob result without calling proxy or direct fetch', async () => {
    const directCalls = [];
    const proxyCalls = [];
    const { fetch } = await importElectricityIndex({
      blobResult: Buffer.from('cached pdf'),
      directFetch: async () => { directCalls.push(1); return Buffer.from('x'); },
    }, 'electricity-blob-hit');
    mock.method(globalThis, 'fetch', async (...args) => { proxyCalls.push(args); });

    const result = await fetch();

    assert.strictEqual(directCalls.length, 0);
    assert.strictEqual(proxyCalls.length, 0);
    assert.ok(Array.isArray(result));
  });

  it('fetches from proxy, stores buffer fire-and-forget, returns parsed result on blob miss', async () => {
    const stored = [];
    const fakePdf = Buffer.from('%PDF proxy-electricity');
    process.env.YC_PROXY_URL = 'https://proxy.yc/bills';
    const { fetch } = await importElectricityIndex({
      blobResult: null,
      storeResult: async (buf, filename) => { stored.push({ filename }); },
    }, 'electricity-proxy-path');
    mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      json: async () => ({ encoding: 'base64', data: fakePdf.toString('base64') }),
    }));

    const result = await fetch();
    await waitForTurn();

    assert.strictEqual(stored.length, 1);
    assert.match(stored[0].filename, /^electricity-/);
    assert.ok(Array.isArray(result));
  });

  it('calls direct fetchElectricity when blob miss and no YC_PROXY_URL', async () => {
    const directCalls = [];
    const { fetch } = await importElectricityIndex({
      blobResult: null,
      directFetch: async () => { directCalls.push(1); return Buffer.from('direct pdf'); },
    }, 'electricity-direct-path');

    const result = await fetch();

    assert.strictEqual(directCalls.length, 1);
    assert.ok(Array.isArray(result));
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```
node --test --experimental-test-module-mocks src/electricity/__tests__/index.test.js
```

Expected: all three tests fail.

- [ ] **Step 3: Implement the new `src/electricity/index.js`**

```js
import { fetch as fetchElectricity, filenamePrefix } from './fetch-electricity.js';
import { parse as parseElectricity } from './parse-electricity.js';
import { getErrorMessage } from '../shared/error-message.js';
import { fetch as fetchBlob, store } from '../shared/storage.js';
import { getCurrentPeriodFilename } from '../shared/period.js';

export async function fetch() {
  try {
    const filename = getCurrentPeriodFilename(filenamePrefix);
    const cached = await fetchBlob(filename);
    if (cached?.length) {
      return parseElectricity(cached);
    }

    const proxyUrl = process.env.YC_PROXY_URL;
    if (proxyUrl) {
      const res = await globalThis.fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'electricity' }),
      });
      if (!res.ok) throw new Error(`Proxy electricity responded with ${res.status}`);
      const { encoding, data } = await res.json();
      if (encoding !== 'base64') throw new Error('Expected base64 from proxy for electricity');
      const buffer = Buffer.from(data, 'base64');
      store(buffer, filename).catch(console.error);
      return parseElectricity(buffer);
    }

    const pdf = await fetchElectricity();
    return parseElectricity(pdf);
  } catch (error) {
    console.log(JSON.stringify({ origin: '⚡️', error: error.message }));
    return { text: getErrorMessage('⚡️'), error: error.message };
  }
}
```

- [ ] **Step 4: Run tests — verify all three pass**

```
node --test --experimental-test-module-mocks src/electricity/__tests__/index.test.js
```

Expected: all 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/electricity/index.js src/electricity/__tests__/index.test.js
git commit -m "feat: electricity provider owns blob/proxy/direct fetch strategy"
```

---

### Task 3: mosobleirc/index.js — add proxy step

**Files:**
- Modify: `src/mosobleirc/index.js`
- Modify: `src/mosobleirc/__tests__/fetch.test.js`

**Interfaces:**
- Consumes: all existing deps + `process.env.YC_PROXY_URL` + `globalThis.fetch`
- Produces: `fetch(): Promise<any[]|{text:string}>` — same contract, proxy now at step 2

- [ ] **Step 1: Write the failing proxy test**

Open `src/mosobleirc/__tests__/fetch.test.js`. Add this test inside the `describe('mosobleirc fetch', ...)` block, after the existing tests:

```js
  it('calls proxy and returns parsed charges when no PDF is cached and YC_PROXY_URL is set', async () => {
    mock.timers.enable({ apis: ['Date'], now: new Date('2026-05-13T12:00:00.000Z') });
    const proxyCalls = [];
    const parsed = [{ text: 'proxy result', value: 999 }];
    process.env.YC_PROXY_URL = 'https://proxy.yc/bills';

    const { fetch } = await importMosOblFetch(
      {
        fetchPdf: async () => null,
        parseCharges: async () => parsed,
      },
      'mosobl-proxy-path',
    );
    mock.method(globalThis, 'fetch', async (url, options) => {
      proxyCalls.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ data: { chargeDetails: [] } }) };
    });

    const result = await fetch();

    assert.deepEqual(proxyCalls, [{ provider: 'mosobleirc' }]);
    assert.deepEqual(result, parsed);
    delete process.env.YC_PROXY_URL;
  });
```

- [ ] **Step 2: Run tests — verify only the new test fails**

```
node --test --experimental-test-module-mocks src/mosobleirc/__tests__/fetch.test.js
```

Expected: all existing tests pass, new proxy test fails.

- [ ] **Step 3: Add proxy step to `src/mosobleirc/index.js`**

Insert the proxy block after the PDF parse block and before the JSON cache read. The existing code reads:

```js
  // [PDF block ends here]

  try {
    const fromStore = await storage.fetch(period);
```

Replace that section so the full file becomes:

```js
import { fetchCharges } from './fetch.js';
import { parseCharges, parsePdfToChargeData, appendPdfMessage } from './parse.js';
import { getErrorMessage } from '../shared/error-message.js';
import { getTodayISODate, getPeriodString } from '../shared/period.js';
import * as storage from './store.js';

export async function fetch() {
  const period = getPeriodString();
  let pdfBuffer;

  try {
    pdfBuffer = await storage.fetchPdf();
  } catch (error) {
    console.log(
      `MosOblEIRC persisted PDF fetch for period ${period} failed.`,
      error,
    );
  }

  if (pdfBuffer?.length) {
    try {
      const pdfData = await parsePdfToChargeData(pdfBuffer);
      const parsed = await parseCharges(pdfData);
      return appendPdfMessage({ messages: parsed, pdfBuffer, period });
    } catch (error) {
      console.log(
        `MosOblEIRC persisted PDF parse/render for period ${period} failed.`,
        error,
      );
    }
  }

  const proxyUrl = process.env.YC_PROXY_URL;
  if (proxyUrl) {
    const res = await globalThis.fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'mosobleirc' }),
    });
    if (!res.ok) {
      throw new Error(`Proxy mosobleirc responded with ${res.status}`);
    }
    const { data } = await res.json();
    return parseCharges(data);
  }

  try {
    const fromStore = await storage.fetch(period);
    if (fromStore) {
      return fromStore;
    }
  } catch (error) {
    console.log(`MosOblEIRC cache read for period ${period} failed.`, error);
  }

  const now = new Date();
  const hour = now.getUTCHours();

  if (hour >= 20 || hour < 3) {
    return {
      text: 'Одинцово: данные доступны только в период с 03:00 до 20:00 UTC',
    };
  }

  try {
    const date = getTodayISODate();
    const json = await fetchCharges(date);
    const parsed = await parseCharges(json);
    try {
      await storage.store(period, parsed);
    } catch (error) {
      console.log(
        `MosOblEIRC cache store for period ${period} failed.`,
        error,
      );
    }
    return parsed;
  } catch (error) {
    return { text: getErrorMessage('Одинцово'), error: error.message };
  }
}
```

- [ ] **Step 4: Run all mosobleirc tests — verify all pass**

```
node --test --experimental-test-module-mocks src/mosobleirc/__tests__/fetch.test.js
```

Expected: all tests pass including the new proxy test.

- [ ] **Step 5: Commit**

```bash
git add src/mosobleirc/index.js src/mosobleirc/__tests__/fetch.test.js
git commit -m "feat: mosobleirc provider owns proxy step in fetch strategy"
```

---

### Task 4: processing.js — remove proxy code path

**Files:**
- Modify: `src/bot/processing.js`
- Modify: `src/bot/__tests__/processing.test.js`

**Interfaces:**
- Produces: `getValues({ venue?: string, format?: string }): Promise<{text: string, attachments: Array}>` — the only export; `getValuesViaProxy` is deleted

- [ ] **Step 1: Update `processing.test.js` — remove proxy describe blocks**

Replace the full contents of `src/bot/__tests__/processing.test.js` with:

```js
import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { resolve } from 'node:path';

const processingModulePath = resolve(import.meta.dirname, '../processing.js');
const waterModulePath = resolve(import.meta.dirname, '../../water/index.js');
const electricityModulePath = resolve(import.meta.dirname, '../../electricity/index.js');
const mosobleircModulePath = resolve(import.meta.dirname, '../../mosobleirc/index.js');

afterEach(() => mock.restoreAll());

describe('getValues', () => {
  it('continues processing when one provider rejects', async () => {
    mock.module(waterModulePath, {
      namedExports: { fetch: async () => [{ emoji: '💧', label: 'Вода', value: 100 }] },
    });
    mock.module(electricityModulePath, {
      namedExports: { fetch: async () => { throw new Error('down'); } },
    });
    mock.module(mosobleircModulePath, {
      namedExports: { fetch: async () => [{ emoji: '💧', label: 'Вода', value: 200 }] },
    });

    const { getValues } = await import(`${processingModulePath}?all-settled`);
    const result = await getValues({ venue: undefined, format: 'compact' });

    assert.match(result.text, /Итого: 300 ₽/);
    assert.match(result.text, /unavailable/i);
    assert.equal(Array.isArray(result.attachments), true);
  });
});
```

- [ ] **Step 2: Run tests — verify the remaining test still passes**

```
node --test --experimental-test-module-mocks src/bot/__tests__/processing.test.js
```

Expected: 1 test passes.

- [ ] **Step 3: Replace `src/bot/processing.js` with the simplified version**

```js
import * as water from '../water/index.js';
import * as electricity from '../electricity/index.js';
import * as mosobleirc from '../mosobleirc/index.js';
import { buildVenueSummary, normalizeProviderPayload } from './summary.js';

const venueProviders = {
  O: [{ name: 'mosobleirc', fetch: mosobleirc.fetch, venue: 'Одинцово' }],
  T: [
    { name: 'water', fetch: water.fetch, venue: 'Трёхгорка' },
    { name: 'electricity', fetch: electricity.fetch, venue: 'Трёхгорка' },
  ],
  DEFAULT: [
    { name: 'water', fetch: water.fetch, venue: 'Трёхгорка' },
    { name: 'electricity', fetch: electricity.fetch, venue: 'Трёхгорка' },
    { name: 'mosobleirc', fetch: mosobleirc.fetch, venue: 'Одинцово' },
  ],
};

export async function getValues({ venue, format = 'compact' }) {
  const providers = venueProviders[venue] ?? venueProviders.DEFAULT;
  const settled = await Promise.allSettled(
    providers.map((provider) => provider.fetch()),
  );
  return buildSummaryFromSettled(settled, providers, format);
}

function buildSummaryFromSettled(settled, providers, format) {
  const normalized = settled.flatMap((entry, index) => {
    const provider = providers[index];
    if (entry.status === 'fulfilled') {
      const payload = normalizeProviderPayload(provider.name, provider.venue, entry.value);
      return payload.sections.map((section) => ({
        ...section,
        attachments: payload.attachments,
      }));
    }

    return [
      {
        provider: provider.name,
        venue: provider.venue,
        entries: [{ emoji: '⚠️', label: 'unavailable', value: null, message: 'unavailable' }],
        totalCents: 0,
        attachments: [],
      },
    ];
  });

  const summary = buildVenueSummary(normalized, format);

  return {
    text: summary.text,
    attachments: normalized.flatMap((section) => section.attachments || []),
  };
}
```

- [ ] **Step 4: Run tests — verify pass**

```
node --test --experimental-test-module-mocks src/bot/__tests__/processing.test.js
```

Expected: 1 test passes.

- [ ] **Step 5: Commit**

```bash
git add src/bot/processing.js src/bot/__tests__/processing.test.js
git commit -m "refactor: processing.js exports single getValues, drops proxy path"
```

---

### Task 5: callback.js — remove proxy branch

**Files:**
- Modify: `src/bot/callback.js`
- Modify: `src/bot/__tests__/callback.test.js`

**Interfaces:**
- Consumes: `getValues({ venue, format }): Promise<{text, attachments}>` from `./processing.js`
- Produces: `callback(ctx, options): Promise<void>` — same contract, no proxy branching

- [ ] **Step 1: Update `callback.test.js` — remove `getValuesViaProxy` from the mock helper**

In `src/bot/__tests__/callback.test.js`, replace the `importCallback` function:

```js
async function importCallback(namedExports, suffix) {
  mock.module(processingModulePath, {
    namedExports,
  });
  return import(`${callbackModulePath}?${suffix}`);
}
```

Also remove the unused `processingModulePath` constant — wait, it is still used. Keep it. Just update the function body (remove the `getValuesViaProxy` default).

- [ ] **Step 2: Run callback tests — verify all still pass**

```
node --test --experimental-test-module-mocks src/bot/__tests__/callback.test.js
```

Expected: all 3 tests pass (they already mock `getValues`, the removed default was defensive noise).

- [ ] **Step 3: Simplify `src/bot/callback.js`**

```js
import { getValues } from './processing.js';

export async function callback(ctx, options) {
  const debug = options?.debug ?? false;
  const format = process.env.MESSAGE_FORMAT === 'detailed' ? 'detailed' : 'compact';

  try {
    await ctx.reply('⏳ Wait for it...');
    const summary = await getValues({ venue: options?.venue, format });
    await ctx.reply(summary.text, { parse_mode: 'HTML' });

    if (summary.attachments.length === 1) {
      const [file] = summary.attachments;
      await ctx.replyWithDocument({ source: file.fileBuffer, filename: file.fileTitle });
    } else if (summary.attachments.length > 1) {
      await ctx.replyWithMediaGroup(
        summary.attachments.map((file) => ({
          type: 'document',
          media: { source: file.fileBuffer, filename: file.fileTitle },
        })),
      );
    }
  } catch (error) {
    await ctx.reply('💥 Ошибка. Не удалось получить данные.');
    if (debug) {
      await ctx.reply(serializeError(error));
    }
  }
}

function serializeError(error) {
  if (error instanceof Error) {
    return JSON.stringify({
      name: error.name,
      message: error.message,
      ...(error.stack ? { stack: error.stack } : {}),
    });
  }

  return JSON.stringify(error);
}
```

- [ ] **Step 4: Run all tests — verify full suite passes**

```
node --test --experimental-test-module-mocks
```

Expected: all tests pass. Count should be current count + 6 new tests (3 water, 3 electricity) minus the 5 removed `getValuesViaProxy` tests.

- [ ] **Step 5: Commit**

```bash
git add src/bot/callback.js src/bot/__tests__/callback.test.js
git commit -m "refactor: callback.js drops YC_PROXY_URL branch, calls getValues unconditionally"
```
