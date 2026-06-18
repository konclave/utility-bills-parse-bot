import { downloadInvoice } from '../src/mosenergo-bill-store/fetch.js';
import { getFilenameFromPdf, getStringsFromPdf } from '../src/shared/parse-pdf.js';
import { store } from '../src/shared/blob.js';
import { filenamePrefix as electricityPrefix } from '../src/electricity/fetch-electricity.js';
import { filenamePrefix as mosobleircPrefix } from '../src/mosobleirc/config.js';

/**
 * Vercel API handler — accepts a PDF URL from the YC store function, downloads
 * the PDF, validates it (Trehgorka account check for MOSENERGO), extracts the
 * billing-period filename, and stores it in Vercel Blob.
 * @param {import('http').IncomingMessage & {body: {url?: string, type?: string}}} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.STORE_PDF_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'STORE_PDF_SECRET is not configured' });
  }
  if (req.headers['authorization'] !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { url, type } = req.body;
  if (!url || !type) {
    return res.status(400).json({ error: 'url and type are required' });
  }

  try {
    const pdf = await downloadInvoice(new URL(url));

    if (type === 'MOSENERGO') {
      const strings = await getStringsFromPdf(pdf);
      if (!strings.some((s) => s.includes('023221017850'))) {
        return res.status(200).json({ ok: true, skipped: true });
      }
    }

    const prefix = type === 'MOSOBLEIRC' ? mosobleircPrefix : electricityPrefix;
    const filename = await getFilenameFromPdf(pdf, prefix);
    if (!filename) {
      return res.status(422).json({ error: 'Cannot extract filename from PDF' });
    }

    await store(Buffer.from(pdf), filename);
    return res.status(200).json({ ok: true, filename });
  } catch (error) {
    console.error('[store-pdf] error:', error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }
}
