# Provider Fetch Strategy Refactor

**Date:** 2026-06-19  
**Branch:** feature/vercel-bot-yc-proxy  
**Status:** Approved

## Problem

Environment routing logic (`YC_PROXY_URL` check) lives in the bot layer — `callback.js` branches to `getValues()` or `getValuesViaProxy()` in `processing.js`, and `processing.js` contains two separate code paths with blob caching, base64 decoding, and proxy HTTP calls inlined. Providers know nothing about the transport strategy.

## Goal

Each provider's `index.js` owns its full fetch strategy. The bot layer calls one function and gets results — it doesn't know or care whether data came from a blob cache, a proxy, or a direct API call.

## Architecture

Four layers, each with one responsibility:

```
callback.js
  └─ bot/processing.js         ← orchestrates providers, builds summary
       ├─ water/index.js        ← fetch strategy: blob → proxy or direct → parse
       ├─ electricity/index.js  ← same inline pattern as water
       └─ mosobleirc/index.js   ← PDF blob → proxy or (JSON cache → direct)
```

## Components

### `src/bot/callback.js`

Drops the `proxyUrl` read and the ternary branch. Calls `getValues({ venue, format })` unconditionally.

### `src/bot/processing.js`

Removes `getValuesViaProxy()` and all blob/proxy internals. Exports a single `getValues({ venue, format })` that iterates the `venueProviders` map, calls each provider's `fetch()` via `Promise.allSettled`, and calls `buildSummaryFromSettled()`. No knowledge of transport.

### `src/water/index.js`

Inline fetch strategy:
1. `fetchBlob(getCurrentPeriodFilename('water-'))` → if hit, `parseWater(buffer)`
2. Else if `process.env.YC_PROXY_URL` → POST `{ provider: 'water' }` → decode base64 → `store(buffer, filename)` (fire-and-forget) → `parseWater(buffer)`
3. Else → `fetchWater()` → `parseWater(pdf)`

Error handling: existing try/catch + `getErrorMessage('💧')` wraps all paths.

### `src/electricity/index.js`

Same inline pattern as water — blob cache → proxy (base64 PDF) → direct. Uses `'electricity-'` prefix and `parseElectricity`.

### `src/mosobleirc/index.js`

Absorbs the proxy path currently in `processing.js:fetchMosobleirc()`. Full fallback chain:
1. `storage.fetchPdf()` → parse PDF → return
2. Else if `process.env.YC_PROXY_URL` → POST `{ provider: 'mosobleirc' }` → proxy returns `{ data: chargesJson }` (no base64, raw JSON) → `parseCharges(data)` → return
3. Else → `storage.fetch(period)` → return cached JSON
4. Time window check (20:00–03:00 UTC guard)
5. Direct `fetchCharges(date)` → `parseCharges(json)` → `storage.store(period, parsed)` → return

Note: the YC proxy reaches `lkk.mosobleirc.ru` (unreachable from Vercel/US). It returns charges JSON directly, not a base64 PDF — so the response shape differs from water/electricity.

## Data Flow

```
User triggers /bills
  → callback.js: getValues({ venue, format })
    → processing.js: venueProviders[venue].map(p => p.fetch())
      → water.fetch()     — blob | proxy | direct
      → electricity.fetch() — blob | proxy | direct
      → mosobleirc.fetch()  — PDF blob | proxy | JSON cache | direct
    → buildSummaryFromSettled()
  → { text, attachments }
  → ctx.reply / replyWithDocument / replyWithMediaGroup
```

## Error Handling

No change to the existing contract: each provider's `fetch()` returns either a result or `{ text: errorMessage, error: ... }` — never throws. `processing.js` receives settled results and maps failures to the unavailable placeholder in `buildSummaryFromSettled`. Proxy HTTP errors (non-2xx, unexpected response shape) throw inside the provider and are caught by its own try/catch.

## Files Changed

| File | Change |
|------|--------|
| `src/bot/callback.js` | Remove `proxyUrl` read and ternary |
| `src/bot/processing.js` | Remove `getValuesViaProxy`, `fetchAndParse`, `fetchMosobleirc` |
| `src/water/index.js` | Absorb blob cache + proxy + direct strategy |
| `src/electricity/index.js` | Absorb blob cache + proxy + direct strategy |
| `src/mosobleirc/index.js` | Absorb proxy step (step 2 in fallback chain) |

## Tests

- `water/index.js` tests: three scenarios — blob hit (mock `storage.fetch`), proxy path (mock `fetch` + `YC_PROXY_URL`), direct path (mock `fetchWater`)
- `electricity/index.js` tests: same three scenarios
- `mosobleirc/index.js` tests: add proxy path scenario alongside existing ones
- `processing.js` tests: remove proxy-path tests; simplify to single `getValues()` orchestration
- `callback.js` tests: remove `proxyUrl` branching tests
