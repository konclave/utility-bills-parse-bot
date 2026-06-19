import { put, list, del } from '@vercel/blob';

export async function fetch(filename) {
  try {
    const { blobs } = await list({ prefix: filename, limit: 1 });
    const blob = blobs.find((b) => b.pathname === filename);
    if (!blob) return null;
    const res = await globalThis.fetch(blob.url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function store(buffer, filename) {
  await put(filename, buffer, { access: 'public', addRandomSuffix: false });
}

export async function purge(prefix, keep = 12) {
  try {
    const { blobs } = await list({ prefix });
    const sorted = [...blobs].sort((a, b) => {
      const periodOf = (pathname) => {
        const m = pathname.match(/(\d{2})-(\d{4})\./);
        return m ? Number(m[2]) * 12 + Number(m[1]) : 0;
      };
      return periodOf(b.pathname) - periodOf(a.pathname);
    });
    const toDelete = sorted.slice(keep).map((b) => b.url);
    if (toDelete.length > 0) {
      await del(toDelete);
    }
  } catch (err) {
    console.error('[storage.purge] failed:', err);
  }
}
