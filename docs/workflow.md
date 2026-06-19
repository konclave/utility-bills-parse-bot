# Bot Workflow

## Overview

The bot is split across two runtimes: **Vercel** hosts the Telegram webhook and user-facing logic, and **Yandex Cloud (YC)** runs the provider-fetching proxy that reaches Russian utility APIs from a Russian IP. **Vercel Blob** acts as a shared PDF cache between the two.

---

## System Architecture

```mermaid
graph TD
    TG[Telegram]

    subgraph Vercel
        WH[api/webhook.js]
        SP[api/store-pdf.js]
        BOT[Bot logic\ncallback.js / processing.js]
        BLOB[(Vercel Blob\nPDF cache)]
    end

    subgraph YC["Yandex Cloud"]
        PROXY[proxy.js\nProvider proxy]
        EMAIL[mosenergo-bill-store\nEmail trigger]
        S3[(YC S3\nMosobleirc JSON cache)]
    end

    WATER_SVC[Тройка Water API]
    ELEC_SVC[Mosenergo API]
    MOSOBL_SVC[Mosobleirc API\nlkk.mosobleirc.ru]
    MOSOBL_EPD[Mosobleirc PDF server\nepd.mosobleirc.ru]
    MOSENERGO_PRINT[Mosenergo PDF server\nmy.mosenergosbyt.ru]

    TG -->|update| WH
    WH --> BOT
    BOT -->|check PDF cache| BLOB
    BOT -->|on Blob miss| PROXY
    BOT -->|reply text + doc| TG

    PROXY --> WATER_SVC
    PROXY --> ELEC_SVC
    PROXY --> MOSOBL_SVC

    EMAIL -->|PDF URL| SP
    SP -->|download PDF| MOSOBL_EPD
    SP -->|download PDF| MOSENERGO_PRINT
    SP -->|store PDF| BLOB

    MOSOBL_SVC -->|JSON charges| PROXY
    PROXY -->|JSON| BOT
    BOT <-->|JSON cache| S3
```

---

## Venues and Providers

| Venue button | Code | Providers fetched |
|---|---|---|
| Одинцово | `O` | Mosobleirc |
| Трёхгорка | `T` | Water, Electricity |
| *(both)* | DEFAULT | Water, Electricity, Mosobleirc |

---

## User Interaction Flow

```mermaid
sequenceDiagram
    actor User
    participant TG as Telegram
    participant WH as Vercel webhook
    participant BOT as Bot logic
    participant BLOB as Vercel Blob
    participant PROXY as YC Proxy

    User->>TG: sends "?"
    TG->>WH: update
    WH->>BOT: handleUpdate
    BOT->>TG: "Показать счёт для:" + venue buttons

    User->>TG: clicks venue (e.g. Одинцово)
    TG->>WH: callback update
    WH->>BOT: callback(ctx, { venue: 'O' })
    BOT->>TG: "⏳ Wait for it..."

    BOT->>BLOB: fetchByName("mosobleirc-MM-YYYY.pdf")

    alt PDF in Blob
        BLOB-->>BOT: Buffer
        BOT->>BOT: parsePdfToChargeData + parseCharges + appendPdfMessage
        Note over BOT: on parse error → fall through to proxy
    end

    alt No PDF in Blob (or parse failed)
        BOT->>PROXY: POST { provider: "mosobleirc" }
        PROXY->>PROXY: fetchCharges (Mosobleirc API)
        PROXY-->>BOT: { encoding: "json", data: chargeDetails }
        BOT->>BOT: parseCharges(data)
    end

    BOT->>TG: text with charge summary

    alt 1 PDF attachment
        BOT->>TG: replyWithDocument(pdf)
    else 2+ PDF attachments
        BOT->>TG: replyWithMediaGroup([pdf, ...])
    end
```

---

## PDF Ingestion Flow

PDFs for Mosobleirc and Mosenergo (electricity) arrive by email and are stored in Vercel Blob so the bot can attach them to replies.

```mermaid
sequenceDiagram
    participant EMAIL as Email\n(epd@mosobleirc.ru\nor mes_schet@mosenergosbyt.ru)
    participant YC_TRG as YC Email Trigger\n(mosenergo-bill-store)
    participant SP as Vercel\napi/store-pdf
    participant PDF_SRV as PDF server\n(epd.mosobleirc.ru or\nmy.mosenergosbyt.ru)
    participant BLOB as Vercel Blob

    EMAIL->>YC_TRG: forwarded email event
    YC_TRG->>YC_TRG: handleEmailEvent\nextract PDF URL + type
    YC_TRG->>SP: POST { url, type } + Bearer secret

    SP->>PDF_SRV: GET pdf URL
    PDF_SRV-->>SP: PDF binary

    alt type == MOSENERGO
        SP->>SP: validate account number 023221017850\n(skip if not Трёхгорка account)
    end

    SP->>SP: getFilenameFromPdf\n→ e.g. "mosobleirc-05-2026.pdf"
    SP->>BLOB: put(filename, pdfBuffer)
    SP-->>YC_TRG: { ok: true, filename }
```

---

## Caching Strategy

| Provider | Cache location | Key format | Populated by |
|---|---|---|---|
| Water | Vercel Blob | `water-MM-YYYY.pdf` | Proxy response (fire-and-forget) |
| Electricity | Vercel Blob | `electricity-MM-YYYY.pdf` | Proxy response (fire-and-forget) |
| Mosobleirc PDF | Vercel Blob | `mosobleirc-MM-YYYY.pdf` | Email trigger → `store-pdf` |
| Mosobleirc charges | YC S3 | `mosobleirc.json` → `{ "MM-YYYY": [...] }` | Direct API fetch (fallback) |

The current billing period key is always the **previous calendar month** (e.g. in June 2026 → `05-2026`).

---

## Environment Variables

| Variable | Runtime | Purpose |
|---|---|---|
| `BOT_TOKEN` | Vercel | Telegram bot token |
| `YC_PROXY_URL` | Vercel | Full URL of the YC proxy function; if unset the bot fetches providers directly |
| `STORE_PDF_SECRET` | Vercel + YC | Shared Bearer token protecting `api/store-pdf` |
| `VERCEL_STORE_PDF_URL` | YC | Full URL of `api/store-pdf` on Vercel |
| `BLOB_READ_WRITE_TOKEN` | Vercel | Vercel Blob access token |
| `MOSOBL_ACCOUNT` | YC | Mosobleirc account number |
| `MOSOBL_TENANT_TOKEN` | YC | Mosobleirc tenant auth token |
| `MESSAGE_FORMAT` | Vercel | `compact` (default) or `detailed` reply format |
| `REQUEST_TIMEOUT` | YC | Timeout in ms for provider HTTP requests |
