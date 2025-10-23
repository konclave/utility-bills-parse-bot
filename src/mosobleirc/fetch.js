import { loginAndGetSession } from './auth.js';

export async function fetchCharges(dateStr) {
  const account = process.env.MOSOBL_ACCOUNT;
  const tenantToken = process.env.MOSOBL_TENANT_TOKEN;

  if (!account) {
    throw new Error('MOSOBL_ACCOUNT is missing');
  }

  if (!tenantToken) {
    throw new Error('MOSOBL_TENANT_TOKEN is missing');
  }

  const controller = new AbortController();
  const timeoutMs = Number(process.env.REQUEST_TIMEOUT || 0);
  let timeout;
  if (timeoutMs > 0) {
    timeout = setTimeout(() => controller.abort(), timeoutMs);
  }

  try {
    const { cookieHeader } = await loginAndGetSession({ controller });

    const url = new URL(
      `https://lkk.mosobleirc.ru/api/api/personal_account/charge-details/${encodeURIComponent(
        account,
      )}`,
    );
    url.searchParams.set('date', dateStr);

    const headers = {
      Accept: '*/*',
      'Content-Type': 'application/json',
      Referer: 'https://lkk.mosobleirc.ru/',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      ...(tenantToken ? { 'X-Auth-Tenant-Token': tenantToken } : {}),
      Cookie: cookieHeader,
    };

    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `MosOblEIRC request failed: ${res.status} ${res.statusText} ${text}`,
      );
    }

    return await res.json();
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
