import { put, list } from '@vercel/blob';

/**
 * Stores a PDF buffer in Vercel Blob under the given filename.
 * @param {Buffer} buffer - PDF binary content to store
 * @param {string} filename - Blob pathname, e.g. 'water-05-2026.pdf'
 * @returns {Promise<void>}
 */
export async function store(buffer, filename) {
  await put(filename, buffer, { access: 'public', addRandomSuffix: false });
}

/**
 * Fetches a blob by its exact pathname. Returns null when the file does not exist.
 * @param {string} filename - Blob pathname to look up, e.g. 'water-05-2026.pdf'
 * @returns {Promise<Buffer|null>}
 */
export async function fetchByName(filename) {
  const { blobs } = await list({ prefix: filename, limit: 1 });
  const blob = blobs.find((b) => b.pathname === filename);
  if (!blob) return null;
  const res = await fetch(blob.url);
  if (!res.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}
